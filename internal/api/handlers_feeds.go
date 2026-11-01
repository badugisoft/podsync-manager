package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"sync"

	"github.com/badugisoft/podsync-manager/internal/config"
	"github.com/badugisoft/podsync-manager/internal/episodes"
	"github.com/go-chi/chi/v5"
)

type UpsertFeedPayload struct {
	ID   string             `json:"id,omitempty"`
	Feed *config.FeedConfig `json:"feed"`
}

type FeedListItem struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Image        string `json:"image,omitempty"`
	EpisodeCount int    `json:"episodeCount"`
	*config.FeedConfig
}

func HandleListFeeds(w http.ResponseWriter, r *http.Request) {
	cfg, _, err := config.LoadConfig()
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to load feeds: "+err.Error())
		return
	}

	var list []FeedListItem
	if cfg.Feeds != nil && len(cfg.Feeds) > 0 {
		type result struct {
			index int
			item  FeedListItem
		}

		resChan := make(chan result, len(cfg.Feeds))
		var wg sync.WaitGroup

		keys := make([]string, 0, len(cfg.Feeds))
		for k := range cfg.Feeds {
			keys = append(keys, k)
		}

		for i, id := range keys {
			wg.Add(1)
			go func(idx int, feedID string, f *config.FeedConfig) {
				defer wg.Done()
				title := feedID
				var image string
				epCount := 0

				epRes, err := episodes.FetchFeedEpisodes(r.Context(), feedID)
				if err == nil && epRes != nil {
					if epRes.Channel.Title != "" {
						title = epRes.Channel.Title
					}
					image = epRes.Channel.Image
					if image == "" && len(epRes.Episodes) > 0 {
						image = epRes.Episodes[0].Thumbnail
					}
					epCount = len(epRes.Episodes)
				}

				if f != nil && f.Custom != nil {
					if f.Custom.Title != "" {
						title = f.Custom.Title
					}
					if f.Custom.CoverArt != "" && image == "" {
						image = f.Custom.CoverArt
					}
				}

				resChan <- result{
					index: idx,
					item: FeedListItem{
						ID:           feedID,
						Title:        title,
						Image:        image,
						EpisodeCount: epCount,
						FeedConfig:   f,
					},
				}
			}(i, id, cfg.Feeds[id])
		}

		wg.Wait()
		close(resChan)

		results := make([]FeedListItem, len(keys))
		for r := range resChan {
			results[r.index] = r.item
		}
		list = results
	} else {
		list = []FeedListItem{}
	}

	JSON(w, http.StatusOK, map[string]any{
		"feeds":      list,
		"configPath": config.GetConfigPath(),
	})
}

func HandleCreateFeed(w http.ResponseWriter, r *http.Request) {
	var payload UpsertFeedPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.ID == "" || payload.Feed == nil {
		JSONError(w, http.StatusBadRequest, "Invalid feed payload: ID and feed object are required")
		return
	}

	existing, _ := config.GetFeed(payload.ID)
	if existing != nil {
		JSONError(w, http.StatusConflict, "Feed ID already exists")
		return
	}

	if err := config.UpsertFeed(payload.ID, payload.Feed); err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to save feed: "+err.Error())
		return
	}

	JSON(w, http.StatusCreated, map[string]any{"success": true, "id": payload.ID})
}

func HandleGetFeed(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	feed, err := config.GetFeed(id)
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to load feed: "+err.Error())
		return
	}
	if feed == nil {
		JSONError(w, http.StatusNotFound, "Feed not found")
		return
	}
	JSON(w, http.StatusOK, map[string]any{"id": id, "feed": feed})
}

func HandleUpdateFeed(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var payload UpsertFeedPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Feed == nil {
		JSONError(w, http.StatusBadRequest, "Invalid feed payload")
		return
	}

	if err := config.UpsertFeed(id, payload.Feed); err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to update feed: "+err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]any{"success": true, "id": id})
}

func HandleDeleteFeed(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := config.DeleteFeed(id); err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to delete feed: "+err.Error())
		return
	}
	JSON(w, http.StatusOK, map[string]any{"success": true})
}

func HandleCheckFeedID(w http.ResponseWriter, r *http.Request) {
	id := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("id")))
	if id == "" {
		JSON(w, http.StatusOK, map[string]any{"valid": false, "exists": false, "message": "피드 ID를 입력해주세요."})
		return
	}

	validRegex := regexp.MustCompile(`^[a-z0-9_]+$`)
	if !validRegex.MatchString(id) {
		JSON(w, http.StatusOK, map[string]any{"valid": false, "exists": false, "message": "영문 소문자, 숫자, 언더스코어(_)만 사용할 수 있습니다."})
		return
	}

	feed, _ := config.GetFeed(id)
	if feed != nil {
		JSON(w, http.StatusOK, map[string]any{"valid": false, "exists": true, "message": "'" + id + "'는 이미 사용 중인 피드 ID입니다."})
		return
	}

	JSON(w, http.StatusOK, map[string]any{"valid": true, "exists": false, "message": "'" + id + "'는 사용 가능한 피드 ID입니다."})
}

func HandleGetFeedEpisodes(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	res, err := episodes.FetchFeedEpisodes(r.Context(), id)
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to fetch episodes: "+err.Error())
		return
	}
	JSON(w, http.StatusOK, res)
}
