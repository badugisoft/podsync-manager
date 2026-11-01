package api

import (
	"net/http"

	"github.com/badugisoft/podsync-manager/internal/config"
	"github.com/badugisoft/podsync-manager/internal/docker"
)

type SystemOverviewResponse struct {
	Container  docker.ContainerStatusInfo `json:"container"`
	HasChanges bool                       `json:"hasChanges"`
	HasBackup  bool                       `json:"hasBackup"`
	FeedsCount int                        `json:"feedsCount"`
	MTime      int64                      `json:"mtime"`
	Version    string                     `json:"version"`
}

func HandleSystemOverview(w http.ResponseWriter, r *http.Request) {
	containerStatus := docker.GetPodsyncStatus(r.Context())
	cfg, currentToml, _ := config.LoadConfig()
	appliedToml := config.GetAppliedConfigToml()

	diffLines := ComputeLineDiff(appliedToml, currentToml)
	hasChanges := false
	for _, l := range diffLines {
		if l.Type != "unchanged" {
			hasChanges = true
			break
		}
	}

	feedsCount := 0
	if cfg != nil && cfg.Feeds != nil {
		feedsCount = len(cfg.Feeds)
	}

	JSON(w, http.StatusOK, SystemOverviewResponse{
		Container:  containerStatus,
		HasChanges: hasChanges,
		HasBackup:  config.HasBackupConfig(),
		FeedsCount: feedsCount,
		MTime:      config.GetConfigMTime(),
		Version:    "0.2.1",
	})
}
