package config

import (
	"path/filepath"
	"testing"
)

func TestConfigCRUD(t *testing.T) {
	tempDir := t.TempDir()
	confPath := filepath.Join(tempDir, "config.toml")
	t.Setenv("PODSYNC_CONFIG_PATH", confPath)

	cfg, raw, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.Server == nil || *cfg.Server.Port != 8080 {
		t.Fatalf("Expected default port 8080, got %v", cfg.Server)
	}
	_ = raw

	// Feed 추가
	feed := &FeedConfig{
		URL:    "https://youtube.com/test",
		Format: "audio",
	}
	err = UpsertFeed("myfeed", feed)
	if err != nil {
		t.Fatalf("UpsertFeed failed: %v", err)
	}

	loadedFeed, err := GetFeed("myfeed")
	if err != nil || loadedFeed == nil {
		t.Fatalf("GetFeed failed: %v", err)
	}
	if loadedFeed.URL != "https://youtube.com/test" {
		t.Fatalf("URL mismatch: %s", loadedFeed.URL)
	}

	// 피드 수정 (두 번째 저장이므로 이때 이전 파일의 .bak 생성)
	feed.Format = "video"
	err = UpsertFeed("myfeed", feed)
	if err != nil {
		t.Fatalf("Second UpsertFeed failed: %v", err)
	}

	// 백업 파일 생성 확인
	if !HasBackupConfig() {
		t.Fatalf("Expected .bak file to exist")
	}

	// 피드 삭제
	err = DeleteFeed("myfeed")
	if err != nil {
		t.Fatalf("DeleteFeed failed: %v", err)
	}

	deletedFeed, err := GetFeed("myfeed")
	if err != nil || deletedFeed != nil {
		t.Fatalf("Expected feed to be deleted")
	}

	// 롤백 확인
	if !RollbackToBackup() {
		t.Fatalf("Rollback failed")
	}

	rolledBackFeed, _ := GetFeed("myfeed")
	if rolledBackFeed == nil {
		t.Fatalf("Expected rolled back feed to exist")
	}
}
