package api

import (
	"encoding/json"
	"net/http"

	"github.com/badugisoft/podsync-manager/internal/config"
	"github.com/pelletier/go-toml/v2"
)

type ConfigResponse struct {
	Config    *config.PodsyncConfig `json:"config"`
	RawToml   string                `json:"rawToml"`
	HasBackup bool                  `json:"hasBackup"`
	MTime     int64                 `json:"mtime"`
}

func HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfg, raw, err := config.LoadConfig()
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to load config: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, ConfigResponse{
		Config:    cfg,
		RawToml:   raw,
		HasBackup: config.HasBackupConfig(),
		MTime:     config.GetConfigMTime(),
	})
}

func HandleSaveConfig(w http.ResponseWriter, r *http.Request) {
	var cfg config.PodsyncConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	if err := config.SaveConfig(&cfg); err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to save config: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]any{"success": true})
}

type RawTomlPayload struct {
	RawToml string `json:"rawToml"`
}

func HandleGetRawToml(w http.ResponseWriter, r *http.Request) {
	_, raw, err := config.LoadConfig()
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to load config: "+err.Error())
		return
	}
	JSON(w, http.StatusOK, RawTomlPayload{RawToml: raw})
}

func HandleSaveRawToml(w http.ResponseWriter, r *http.Request) {
	var payload RawTomlPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	// Validate TOML syntax first
	var dummy map[string]any
	if err := toml.Unmarshal([]byte(payload.RawToml), &dummy); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid TOML syntax: "+err.Error())
		return
	}

	if err := config.SaveRawToml(payload.RawToml); err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to save config: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]any{"success": true})
}

type DiffResponse struct {
	AppliedToml string     `json:"appliedToml"`
	CurrentToml string     `json:"currentToml"`
	DiffLines   []DiffLine `json:"diffLines"`
	HasChanges  bool       `json:"hasChanges"`
}

func HandleGetDiff(w http.ResponseWriter, r *http.Request) {
	_, currentToml, _ := config.LoadConfig()
	appliedToml := config.GetAppliedConfigToml()

	diffLines := ComputeLineDiff(appliedToml, currentToml)
	hasChanges := false
	for _, l := range diffLines {
		if l.Type != "unchanged" {
			hasChanges = true
			break
		}
	}

	JSON(w, http.StatusOK, DiffResponse{
		AppliedToml: appliedToml,
		CurrentToml: currentToml,
		DiffLines:   diffLines,
		HasChanges:  hasChanges,
	})
}

func HandleRollback(w http.ResponseWriter, r *http.Request) {
	if !config.RollbackToBackup() {
		JSONError(w, http.StatusBadRequest, "Rollback failed or no backup available")
		return
	}
	JSON(w, http.StatusOK, map[string]any{"success": true})
}
