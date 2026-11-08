package redownload

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/badugisoft/podsync-manager/internal/docker"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
)

//go:embed assets/dbtool-linux-arm64
var dbtoolBinary []byte

type PendingItem struct {
	FeedID    string `json:"feedId"`
	EpisodeID string `json:"episodeId,omitempty"` // 비어있으면 피드 전체
	AddedAt   string `json:"addedAt"`
}

type StatusResponse struct {
	Count int           `json:"count"`
	Items []PendingItem `json:"items"`
}

var (
	mu      sync.Mutex
	pending []PendingItem
)

// AddPending adds a feed or episode to the redownload queue
func AddPending(feedID, episodeID string) {
	mu.Lock()
	defer mu.Unlock()

	// 중복 방지
	for _, item := range pending {
		if item.FeedID == feedID {
			if item.EpisodeID == "" {
				// 이미 피드 전체가 대기 중이면 단일 에피소드 추가 불필요
				return
			}
			if item.EpisodeID == episodeID {
				return
			}
		}
	}

	// 만약 피드 전체를 추가하는 경우, 기존의 동일 피드 단일 에피소드 항목들 제거
	if episodeID == "" {
		filtered := make([]PendingItem, 0, len(pending))
		for _, item := range pending {
			if item.FeedID != feedID {
				filtered = append(filtered, item)
			}
		}
		pending = filtered
	}

	pending = append(pending, PendingItem{
		FeedID:    feedID,
		EpisodeID: episodeID,
		AddedAt:   time.Now().Format(time.RFC3339),
	})
}

// GetStatus returns the current queue status
func GetStatus() StatusResponse {
	mu.Lock()
	defer mu.Unlock()

	items := make([]PendingItem, len(pending))
	copy(items, pending)
	return StatusResponse{
		Count: len(items),
		Items: items,
	}
}

// ClearPending clears all queued items
func ClearPending() {
	mu.Lock()
	defer mu.Unlock()
	pending = nil
}

// ExecutePendingDeletions runs dbtool inside a temporary container while podsync is stopped
func ExecutePendingDeletions(ctx context.Context) error {
	mu.Lock()
	if len(pending) == 0 {
		mu.Unlock()
		return nil
	}
	items := make([]PendingItem, len(pending))
	copy(items, pending)
	mu.Unlock()

	cli, err := docker.NewDockerClient()
	if err != nil {
		return fmt.Errorf("failed to create docker client: %w", err)
	}
	defer cli.Close()

	// 1. 임베드된 dbtool 바이너리를 호스트 파일시스템에 추출
	tempToolPath := "/tmp/podsync_dbtool"
	if err := os.WriteFile(tempToolPath, dbtoolBinary, 0755); err != nil {
		return fmt.Errorf("failed to extract dbtool: %w", err)
	}

	// 2. Podsync 컨테이너 일시 중지 (DB 파일 락 해제)
	podsyncName := "podsync"
	stopTimeout := 15
	log.Printf("[Redownload] Stopping %s container for DB cache cleanup...", podsyncName)
	_ = cli.ContainerStop(ctx, podsyncName, container.StopOptions{Timeout: &stopTimeout})

	// 3. 임시 Alpine 컨테이너를 띄워 대기 중인 각 항목의 DB 키 삭제 실행
	for _, item := range items {
		log.Printf("[Redownload] Deleting DB cache for feed=%s, episode=%s", item.FeedID, item.EpisodeID)
		cmd := []string{"/dbtool", "/app/db", item.FeedID}
		if item.EpisodeID != "" {
			cmd = append(cmd, item.EpisodeID)
		}

		containerConfig := &container.Config{
			Image: "alpine",
			Cmd:   cmd,
		}
		hostConfig := &container.HostConfig{
			Mounts: []mount.Mount{
				{
					Type:   mount.TypeVolume,
					Source: "podsync_db",
					Target: "/app/db",
				},
				{
					Type:   mount.TypeBind,
					Source: tempToolPath,
					Target: "/dbtool",
				},
			},
		}

		created, err := cli.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, "")
		if err != nil {
			log.Printf("[Redownload] Failed to create db cleanup container: %v", err)
			continue
		}

		if err := cli.ContainerStart(ctx, created.ID, container.StartOptions{}); err != nil {
			log.Printf("[Redownload] Failed to start db cleanup container: %v", err)
			_ = cli.ContainerRemove(ctx, created.ID, container.RemoveOptions{Force: true})
			continue
		}

		statusCh, errCh := cli.ContainerWait(ctx, created.ID, container.WaitConditionNotRunning)
		select {
		case err := <-errCh:
			if err != nil {
				log.Printf("[Redownload] Error waiting for db cleanup: %v", err)
			}
		case <-statusCh:
		}

		_ = cli.ContainerRemove(ctx, created.ID, container.RemoveOptions{Force: true})
	}

	// 4. 완료 후 큐 비우기
	ClearPending()
	log.Printf("[Redownload] All pending DB deletions executed successfully")

	return nil
}
