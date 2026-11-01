package config

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"syscall"

	"github.com/pelletier/go-toml/v2"
)

func GetConfigPath() string {
	if p := os.Getenv("PODSYNC_CONFIG_PATH"); p != "" {
		return p
	}
	if os.Getenv("NODE_ENV") == "production" || os.Getenv("ENV") == "production" {
		return "/app/config/config.toml"
	}
	return "/Users/badugiss/work/badugiss/docker-mini26/services/podsync/config/config.toml"
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err = io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

// writeConfigFile writes content atomically using .tmp and rename,
// with a fallback to in-place overwrite for docker bind-mounts.
func writeConfigFile(filePath string, content []byte) error {
	tmpPath := filePath + ".tmp"
	if err := os.WriteFile(tmpPath, content, 0644); err != nil {
		// If unable to write .tmp, try direct write
		return os.WriteFile(filePath, content, 0644)
	}

	err := os.Rename(tmpPath, filePath)
	if err != nil {
		var linkErr *os.LinkError
		if errors.As(err, &linkErr) {
			if errors.Is(linkErr.Err, syscall.EXDEV) || errors.Is(linkErr.Err, syscall.EBUSY) || errors.Is(linkErr.Err, syscall.EPERM) {
				_ = os.Remove(tmpPath)
				return os.WriteFile(filePath, content, 0644)
			}
		}
		_ = os.Remove(tmpPath)
		return os.WriteFile(filePath, content, 0644)
	}
	return nil
}

func DefaultConfig() *PodsyncConfig {
	port := 8080
	return &PodsyncConfig{
		Server: &ServerConfig{
			Port:     &port,
			Hostname: "http://localhost:8080",
		},
		Storage: &StorageConfig{
			Type: "local",
		},
		Feeds: make(map[string]*FeedConfig),
	}
}

// LoadConfig reads and parses config.toml. If missing, returns default template.
func LoadConfig() (*PodsyncConfig, string, error) {
	filePath := GetConfigPath()
	data, err := os.ReadFile(filePath)
	if err != nil {
		cfg := DefaultConfig()
		b, _ := toml.Marshal(cfg)
		return cfg, string(b), nil
	}

	cfg := &PodsyncConfig{
		Feeds: make(map[string]*FeedConfig),
	}
	if err := toml.Unmarshal(data, cfg); err != nil {
		// Parsing failed, still return raw
		return cfg, string(data), err
	}
	if cfg.Feeds == nil {
		cfg.Feeds = make(map[string]*FeedConfig)
	}
	return cfg, string(data), nil
}

// SaveConfig marshals the config to TOML and writes it with backup.
func SaveConfig(cfg *PodsyncConfig) error {
	b, err := toml.Marshal(cfg)
	if err != nil {
		return err
	}
	return SaveRawToml(string(b))
}

// SaveRawToml saves the raw TOML string to config.toml, keeping .bak and .applied.
func SaveRawToml(rawToml string) error {
	filePath := GetConfigPath()
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	appliedPath := filePath + ".applied"
	if _, err := os.Stat(appliedPath); os.IsNotExist(err) {
		_ = copyFile(filePath, appliedPath)
	}

	backupPath := filePath + ".bak"
	_ = copyFile(filePath, backupPath)

	return writeConfigFile(filePath, []byte(rawToml))
}

func GetConfigMTime() int64 {
	filePath := GetConfigPath()
	info, err := os.Stat(filePath)
	if err != nil {
		return 0
	}
	return info.ModTime().UnixMilli()
}

func HasBackupConfig() bool {
	filePath := GetConfigPath()
	_, err := os.Stat(filePath + ".bak")
	return err == nil
}

func GetAppliedConfigToml() string {
	filePath := GetConfigPath()
	appliedPath := filePath + ".applied"
	data, err := os.ReadFile(appliedPath)
	if err == nil {
		return string(data)
	}

	// If .applied does not exist, copy from current config.toml
	current, err := os.ReadFile(filePath)
	if err == nil {
		_ = os.WriteFile(appliedPath, current, 0644)
		return string(current)
	}
	return ""
}

func MarkConfigAsApplied() error {
	filePath := GetConfigPath()
	appliedPath := filePath + ".applied"
	return copyFile(filePath, appliedPath)
}

func RollbackToBackup() bool {
	filePath := GetConfigPath()
	backupPath := filePath + ".bak"
	err := copyFile(backupPath, filePath)
	return err == nil
}

func GetFeed(id string) (*FeedConfig, error) {
	cfg, _, err := LoadConfig()
	if err != nil {
		return nil, err
	}
	if f, exists := cfg.Feeds[id]; exists {
		return f, nil
	}
	return nil, nil
}

func UpsertFeed(id string, feed *FeedConfig) error {
	cfg, _, err := LoadConfig()
	if err != nil {
		return err
	}
	if cfg.Feeds == nil {
		cfg.Feeds = make(map[string]*FeedConfig)
	}
	cfg.Feeds[id] = feed
	return SaveConfig(cfg)
}

func DeleteFeed(id string) error {
	cfg, _, err := LoadConfig()
	if err != nil {
		return err
	}
	if cfg.Feeds != nil {
		delete(cfg.Feeds, id)
	}
	return SaveConfig(cfg)
}
