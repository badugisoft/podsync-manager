package docker

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/badugisoft/podsync-manager/internal/config"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

func getContainerName() string {
	if n := os.Getenv("PODSYNC_CONTAINER_NAME"); n != "" {
		return n
	}
	return "podsync"
}

func resolveDockerSocketPath() string {
	if s := os.Getenv("DOCKER_SOCKET"); s != "" {
		return s
	}

	home, err := os.UserHomeDir()
	var candidates []string
	if err == nil {
		candidates = append(candidates,
			filepath.Join(home, ".orbstack/run/docker.sock"),
			filepath.Join(home, ".docker/run/docker.sock"),
		)
	}
	candidates = append(candidates, "/var/run/docker.sock")

	for _, cand := range candidates {
		if fi, err := os.Stat(cand); err == nil && (fi.Mode()&os.ModeSocket != 0 || fi.Mode().IsRegular()) {
			return cand
		}
	}
	return "/var/run/docker.sock"
}

func NewDockerClient() (*client.Client, error) {
	socketPath := resolveDockerSocketPath()
	host := "unix://" + socketPath
	return client.NewClientWithOpts(
		client.WithHost(host),
		client.WithAPIVersionNegotiation(),
	)
}

type ContainerStatusInfo struct {
	Name        string `json:"name"`
	Status      string `json:"status"` // "running" | "exited" | "paused" | "restarting" | "not_found" | "error"
	StateText   string `json:"stateText,omitempty"`
	Uptime      string `json:"uptime,omitempty"`
	ErrorDetail string `json:"errorDetail,omitempty"`
}

func GetPodsyncStatus(ctx context.Context) ContainerStatusInfo {
	name := getContainerName()
	cli, err := NewDockerClient()
	if err != nil {
		return ContainerStatusInfo{
			Name:        name,
			Status:      "error",
			ErrorDetail: err.Error(),
		}
	}
	defer cli.Close()

	inspect, err := cli.ContainerInspect(ctx, name)
	if err != nil {
		if client.IsErrNotFound(err) {
			return ContainerStatusInfo{Name: name, Status: "not_found"}
		}
		return ContainerStatusInfo{Name: name, Status: "error", ErrorDetail: err.Error()}
	}

	status := "exited"
	if inspect.State.Running {
		status = "running"
	} else if inspect.State.Restarting {
		status = "restarting"
	} else if inspect.State.Paused {
		status = "paused"
	}

	return ContainerStatusInfo{
		Name:      name,
		Status:    status,
		StateText: inspect.State.Status,
		Uptime:    inspect.State.StartedAt,
	}
}

func GetPodsyncEnv(ctx context.Context) map[string]string {
	envMap := make(map[string]string)
	cli, err := NewDockerClient()
	if err != nil {
		return envMap
	}
	defer cli.Close()

	inspect, err := cli.ContainerInspect(ctx, getContainerName())
	if err != nil {
		return envMap
	}

	if inspect.Config != nil {
		for _, item := range inspect.Config.Env {
			idx := strings.Index(item, "=")
			if idx != -1 {
				envMap[item[:idx]] = item[idx+1:]
			}
		}
	}
	return envMap
}

func RestartPodsync(ctx context.Context) error {
	cli, err := NewDockerClient()
	if err != nil {
		return err
	}
	defer cli.Close()

	stopTimeout := 15
	err = cli.ContainerRestart(ctx, getContainerName(), container.StopOptions{Timeout: &stopTimeout})
	if err != nil {
		return err
	}

	_ = config.MarkConfigAsApplied()
	return nil
}

// StreamLogs streams multiplexed stdout/stderr from podsync container to writer.
func StreamLogs(ctx context.Context, w io.Writer, tail string, follow bool) error {
	cli, err := NewDockerClient()
	if err != nil {
		return err
	}
	defer cli.Close()

	reader, err := cli.ContainerLogs(ctx, getContainerName(), container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Tail:       tail,
	})
	if err != nil {
		return err
	}
	defer reader.Close()

	// Docker demux: both stdout and stderr write to w
	_, err = stdcopy.StdCopy(w, w, reader)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, context.Canceled) {
		return err
	}
	return nil
}
