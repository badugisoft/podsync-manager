package episodes

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/badugisoft/podsync-manager/internal/config"
	"github.com/badugisoft/podsync-manager/internal/docker"
)

type PreviewRequest struct {
	URL           string              `json:"url"`
	Filters       *config.FeedFilters `json:"filters,omitempty"`
	YouTubeDLArgs []string            `json:"youtube_dl_args,omitempty"`
	PageSize      *int                `json:"page_size,omitempty"`
}

type PreviewEpisodeItem struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Duration     int64  `json:"duration"`
	DurationStr  string `json:"durationStr"`
	Thumbnail    string `json:"thumbnail,omitempty"`
	UploadDate   string `json:"uploadDate,omitempty"`
	URL          string `json:"url,omitempty"`
	Passed       bool   `json:"passed"`
	RejectReason string `json:"rejectReason,omitempty"`
}

type PreviewResult struct {
	SourceTitle string               `json:"sourceTitle"`
	TotalCount  int                  `json:"totalCount"`
	PassedCount int                  `json:"passedCount"`
	Episodes    []PreviewEpisodeItem `json:"episodes"`
}

// Raw item representation before filter application
type rawVideoItem struct {
	ID          string
	Title       string
	Description string
	Duration    int64
	Thumbnail   string
	UploadDate  string
	URL         string
	IsLive      bool
	IsShorts    bool
}

func formatDuration(sec int64) string {
	if sec <= 0 {
		return ""
	}
	h := sec / 3600
	m := (sec % 3600) / 60
	s := sec % 60
	if h > 0 {
		return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}

// parseISODuration parses ISO 8601 duration e.g. "PT1H15M33S" or "PT45S"
func parseISODuration(iso string) int64 {
	re := regexp.MustCompile(`^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$`)
	m := re.FindStringSubmatch(iso)
	if len(m) == 0 {
		return 0
	}
	var total int64
	if m[1] != "" {
		h, _ := strconv.ParseInt(m[1], 10, 64)
		total += h * 3600
	}
	if m[2] != "" {
		min, _ := strconv.ParseInt(m[2], 10, 64)
		total += min * 60
	}
	if m[3] != "" {
		s, _ := strconv.ParseInt(m[3], 10, 64)
		total += s
	}
	return total
}

func parseDurationAny(raw any) int64 {
	switch v := raw.(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return int64(f)
		}
	}
	return 0
}

// YouTube Atom RSS structs for fallback
type ytRSSFeed struct {
	XMLName xml.Name     `xml:"feed"`
	Title   string       `xml:"title"`
	Entries []ytRSSEntry `xml:"entry"`
}

type ytRSSEntry struct {
	VideoID   string `xml:"http://www.youtube.com/xml/schemas/2015 videoId"`
	Title     string `xml:"title"`
	Link      struct {
		Href string `xml:"href,attr"`
	} `xml:"link"`
	Published string `xml:"published"`
	Media     struct {
		Description string `xml:"http://search.yahoo.com/mrss/ description"`
		Thumbnail   struct {
			URL string `xml:"url,attr"`
		} `xml:"http://search.yahoo.com/mrss/ thumbnail"`
	} `xml:"http://search.yahoo.com/mrss/ group"`
}

func fetchYouTubeViaAPI(ctx context.Context, apiKey string, targetURL string, limit int) (string, []rawVideoItem, error) {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return "", nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	var uploadPlaylistID string
	var sourceTitle string

	// 1. Identify playlist ID or channel ID
	q := parsedURL.Query()
	playlistParam := q.Get("list")
	pathParts := strings.Split(strings.Trim(parsedURL.Path, "/"), "/")

	if playlistParam != "" {
		uploadPlaylistID = playlistParam
	} else if len(pathParts) >= 2 && pathParts[0] == "channel" {
		channelID := pathParts[1]
		// Convert UC... to UU... (uploads playlist)
		if strings.HasPrefix(channelID, "UC") && len(channelID) > 2 {
			uploadPlaylistID = "UU" + channelID[2:]
		}
	} else if len(pathParts) >= 1 && strings.HasPrefix(pathParts[0], "@") {
		// Handle custom handle e.g. @user-charlesmililab
		handleURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=%s&key=%s", url.QueryEscape(pathParts[0]), apiKey)
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, handleURL, nil)
		res, err := client.Do(req)
		if err == nil && res.StatusCode == http.StatusOK {
			var resp struct {
				Items []struct {
					Snippet struct {
						Title string `json:"title"`
					} `json:"snippet"`
					ContentDetails struct {
						RelatedPlaylists struct {
							Uploads string `json:"uploads"`
						} `json:"relatedPlaylists"`
					} `json:"contentDetails"`
				} `json:"items"`
			}
			if json.NewDecoder(res.Body).Decode(&resp) == nil && len(resp.Items) > 0 {
				uploadPlaylistID = resp.Items[0].ContentDetails.RelatedPlaylists.Uploads
				sourceTitle = resp.Items[0].Snippet.Title
			}
			res.Body.Close()
		}
	}

	if uploadPlaylistID == "" {
		return "", nil, errors.New("cannot determine uploads playlist ID")
	}

	// 2. Fetch playlist items
	plURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=%s&maxResults=%d&key=%s",
		url.QueryEscape(uploadPlaylistID), limit, apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, plURL, nil)
	if err != nil {
		return "", nil, err
	}
	res, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return "", nil, fmt.Errorf("YouTube API error (HTTP %d): %s", res.StatusCode, string(body))
	}

	var plResp struct {
		Items []struct {
			Snippet struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				PublishedAt string `json:"publishedAt"`
				ChannelTitle string `json:"channelTitle"`
				Thumbnails  map[string]struct {
					URL string `json:"url"`
				} `json:"thumbnails"`
				ResourceId struct {
					VideoId string `json:"videoId"`
				} `json:"resourceId"`
			} `json:"snippet"`
		} `json:"items"`
	}

	if err := json.NewDecoder(res.Body).Decode(&plResp); err != nil {
		return "", nil, err
	}

	if len(plResp.Items) == 0 {
		return sourceTitle, []rawVideoItem{}, nil
	}

	if sourceTitle == "" && len(plResp.Items) > 0 {
		sourceTitle = plResp.Items[0].Snippet.ChannelTitle
	}

	// Collect video IDs to fetch duration
	videoIDs := make([]string, 0, len(plResp.Items))
	for _, it := range plResp.Items {
		vid := it.Snippet.ResourceId.VideoId
		if vid != "" {
			videoIDs = append(videoIDs, vid)
		}
	}

	durations := make(map[string]int64)
	isLiveMap := make(map[string]bool)

	if len(videoIDs) > 0 {
		vidURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=%s&key=%s",
			url.QueryEscape(strings.Join(videoIDs, ",")), apiKey)
		vReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, vidURL, nil)
		if vRes, err := client.Do(vReq); err == nil && vRes.StatusCode == http.StatusOK {
			var vidResp struct {
				Items []struct {
					ID      string `json:"id"`
					Snippet struct {
						LiveBroadcastContent string `json:"liveBroadcastContent"`
					} `json:"snippet"`
					ContentDetails struct {
						Duration string `json:"duration"`
					} `json:"contentDetails"`
				} `json:"items"`
			}
			if json.NewDecoder(vRes.Body).Decode(&vidResp) == nil {
				for _, v := range vidResp.Items {
					durations[v.ID] = parseISODuration(v.ContentDetails.Duration)
					if v.Snippet.LiveBroadcastContent == "live" || v.Snippet.LiveBroadcastContent == "upcoming" {
						isLiveMap[v.ID] = true
					}
				}
			}
			vRes.Body.Close()
		}
	}

	items := make([]rawVideoItem, 0, len(plResp.Items))
	for _, it := range plResp.Items {
		vid := it.Snippet.ResourceId.VideoId
		if vid == "" {
			continue
		}

		thumb := ""
		if t, ok := it.Snippet.Thumbnails["medium"]; ok {
			thumb = t.URL
		} else if t, ok := it.Snippet.Thumbnails["default"]; ok {
			thumb = t.URL
		}

		uploadDate := it.Snippet.PublishedAt
		if len(uploadDate) >= 10 {
			uploadDate = uploadDate[:10]
		}

		durationSec := durations[vid]
		// Determine if it's a short (<= 60s or contains #shorts)
		isShort := durationSec > 0 && durationSec <= 60
		if strings.Contains(strings.ToLower(it.Snippet.Title), "#short") || strings.Contains(strings.ToLower(it.Snippet.Description), "#short") {
			isShort = true
		}

		items = append(items, rawVideoItem{
			ID:          vid,
			Title:       it.Snippet.Title,
			Description: it.Snippet.Description,
			Duration:    durationSec,
			Thumbnail:   thumb,
			UploadDate:  uploadDate,
			URL:         fmt.Sprintf("https://www.youtube.com/watch?v=%s", vid),
			IsLive:      isLiveMap[vid],
			IsShorts:    isShort,
		})
	}

	return sourceTitle, items, nil
}

func fetchYouTubeViaRSS(ctx context.Context, targetURL string) (string, []rawVideoItem, error) {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return "", nil, err
	}

	var rssURL string
	q := parsedURL.Query()
	if listID := q.Get("list"); listID != "" {
		rssURL = fmt.Sprintf("https://www.youtube.com/feeds/videos.xml?playlist_id=%s", url.QueryEscape(listID))
	} else {
		pathParts := strings.Split(strings.Trim(parsedURL.Path, "/"), "/")
		if len(pathParts) >= 2 && pathParts[0] == "channel" {
			rssURL = fmt.Sprintf("https://www.youtube.com/feeds/videos.xml?channel_id=%s", url.QueryEscape(pathParts[1]))
		} else {
			return "", nil, errors.New("cannot infer channel or playlist ID for RSS")
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rssURL, nil)
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("RSS HTTP error: %d", res.StatusCode)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return "", nil, err
	}

	var feed ytRSSFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return "", nil, err
	}

	items := make([]rawVideoItem, 0, len(feed.Entries))
	for _, entry := range feed.Entries {
		if entry.VideoID == "" {
			continue
		}
		uploadDate := entry.Published
		if len(uploadDate) >= 10 {
			uploadDate = uploadDate[:10]
		}
		itemURL := entry.Link.Href
		if itemURL == "" {
			itemURL = fmt.Sprintf("https://www.youtube.com/watch?v=%s", entry.VideoID)
		}

		isShort := strings.Contains(strings.ToLower(entry.Title), "#short") || strings.Contains(strings.ToLower(entry.Media.Description), "#short")

		items = append(items, rawVideoItem{
			ID:          entry.VideoID,
			Title:       entry.Title,
			Description: entry.Media.Description,
			Duration:    0,
			Thumbnail:   entry.Media.Thumbnail.URL,
			UploadDate:  uploadDate,
			URL:         itemURL,
			IsLive:      false,
			IsShorts:    isShort,
		})
	}

	return feed.Title, items, nil
}

func fetchViaYtDlp(ctx context.Context, targetURL string, limit int) (string, []rawVideoItem, error) {
	baseArgs := []string{
		"-j",
		"--flat-playlist",
		"--playlist-end", strconv.Itoa(limit),
		"--ignore-errors",
		"--no-warnings",
		targetURL,
	}

	var rawOutput string
	status := docker.GetPodsyncStatus(ctx)
	if status.Status == "running" {
		bin := "youtube-dl"
		out, _, err := docker.ExecInPodsync(ctx, []string{"which", "yt-dlp"})
		if err == nil && strings.TrimSpace(out) != "" {
			bin = "yt-dlp"
		}
		cmd := append([]string{bin}, baseArgs...)
		stdout, stderr, err := docker.ExecInPodsync(ctx, cmd)
		if err != nil && stdout == "" {
			return "", nil, fmt.Errorf("downloader error: %s", stderr)
		}
		rawOutput = stdout
	} else {
		localBin := "yt-dlp"
		if _, err := exec.LookPath("yt-dlp"); err != nil {
			if _, err := exec.LookPath("youtube-dl"); err == nil {
				localBin = "youtube-dl"
			} else {
				return "", nil, errors.New("neither container nor local yt-dlp available")
			}
		}
		cmd := exec.CommandContext(ctx, localBin, baseArgs...)
		out, _ := cmd.Output()
		rawOutput = string(out)
	}

	lines := strings.Split(rawOutput, "\n")
	var items []rawVideoItem
	sourceTitle := targetURL

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}
		var entry struct {
			ID          string `json:"id"`
			Title       string `json:"title"`
			Description string `json:"description"`
			Duration    any    `json:"duration"`
			UploadDate  string `json:"upload_date"`
			WebpageURL  string `json:"webpage_url"`
			URL         string `json:"url"`
			Thumbnail   string `json:"thumbnail"`
			Playlist    string `json:"playlist"`
		}
		if json.Unmarshal([]byte(line), &entry) == nil && (entry.ID != "" || entry.Title != "") {
			if entry.Playlist != "" && sourceTitle == targetURL {
				sourceTitle = entry.Playlist
			}
			itemURL := entry.WebpageURL
			if itemURL == "" {
				itemURL = entry.URL
			}
			dur := parseDurationAny(entry.Duration)
			isShort := strings.Contains(itemURL, "/shorts/") || (dur > 0 && dur <= 60)
			items = append(items, rawVideoItem{
				ID:          entry.ID,
				Title:       entry.Title,
				Description: entry.Description,
				Duration:    dur,
				Thumbnail:   entry.Thumbnail,
				UploadDate:  entry.UploadDate,
				URL:         itemURL,
				IsLive:      false,
				IsShorts:    isShort,
			})
		}
	}

	return sourceTitle, items, nil
}

func PreviewFeed(ctx context.Context, req PreviewRequest) (*PreviewResult, error) {
	if strings.TrimSpace(req.URL) == "" {
		return nil, errors.New("URL is required")
	}

	limit := 15
	if req.PageSize != nil && *req.PageSize > 0 {
		if *req.PageSize > 25 {
			limit = 25
		} else {
			limit = *req.PageSize
		}
	}

	var sourceTitle string
	var rawItems []rawVideoItem

	// Check if URL is YouTube
	isYouTube := strings.Contains(req.URL, "youtube.com") || strings.Contains(req.URL, "youtu.be")
	if isYouTube {
		cfg, _, _ := config.LoadConfig()
		var apiKey string
		if cfg != nil && cfg.Tokens != nil && cfg.Tokens.YouTube != "" {
			apiKey = cfg.Tokens.YouTube
		}

		if apiKey != "" {
			title, items, err := fetchYouTubeViaAPI(ctx, apiKey, req.URL, limit)
			if err == nil && len(items) > 0 {
				sourceTitle = title
				rawItems = items
			}
		}

		if len(rawItems) == 0 {
			title, items, err := fetchYouTubeViaRSS(ctx, req.URL)
			if err == nil && len(items) > 0 {
				sourceTitle = title
				rawItems = items
			}
		}
	}

	// Fallback to yt-dlp if not fetched or not YouTube
	if len(rawItems) == 0 {
		title, items, err := fetchViaYtDlp(ctx, req.URL, limit)
		if err != nil && len(rawItems) == 0 {
			return nil, fmt.Errorf("영상 목록을 가져올 수 없습니다: %w", err)
		}
		sourceTitle = title
		rawItems = items
	}

	if sourceTitle == "" {
		sourceTitle = req.URL
	}

	// Compile regex filters
	var titleRe, notTitleRe, descRe, notDescRe *regexp.Regexp
	if req.Filters != nil {
		if req.Filters.Title != "" {
			titleRe, _ = regexp.Compile(req.Filters.Title)
		}
		if req.Filters.NotTitle != "" {
			notTitleRe, _ = regexp.Compile(req.Filters.NotTitle)
		}
		if req.Filters.Description != "" {
			descRe, _ = regexp.Compile(req.Filters.Description)
		}
		if req.Filters.NotDescription != "" {
			notDescRe, _ = regexp.Compile(req.Filters.NotDescription)
		}
	}

	// Parse youtube_dl_args rules
	excludeLive := false
	shortsFilter := "all" // "exclude" | "only" | "all"
	for i, arg := range req.YouTubeDLArgs {
		if arg == "--match-filter" && i+1 < len(req.YouTubeDLArgs) {
			filterExpr := req.YouTubeDLArgs[i+1]
			if strings.Contains(filterExpr, "!is_live") {
				excludeLive = true
			}
			if strings.Contains(filterExpr, "original_url!*=/shorts/") {
				shortsFilter = "exclude"
			} else if strings.Contains(filterExpr, "original_url*=/shorts/") {
				shortsFilter = "only"
			}
		}
	}

	resultItems := make([]PreviewEpisodeItem, 0, len(rawItems))
	passedCount := 0

	for _, item := range rawItems {
		passed := true
		rejectReason := ""

		// Check live
		if excludeLive && item.IsLive {
			passed = false
			rejectReason = "라이브 방송 제외 필터 매칭"
		}

		// Check shorts
		if passed {
			if shortsFilter == "exclude" && item.IsShorts {
				passed = false
				rejectReason = "쇼츠(Shorts) 제외 필터 매칭"
			} else if shortsFilter == "only" && !item.IsShorts {
				passed = false
				rejectReason = "쇼츠(Shorts) 전용 피드 조건 미충족"
			}
		}

		// Check title regex
		if passed && titleRe != nil && !titleRe.MatchString(item.Title) {
			passed = false
			rejectReason = fmt.Sprintf("제목 필터 미충족: /%s/", req.Filters.Title)
		}

		// Check not_title regex
		if passed && notTitleRe != nil && notTitleRe.MatchString(item.Title) {
			passed = false
			rejectReason = fmt.Sprintf("제외 제목 필터 매칭: /%s/", req.Filters.NotTitle)
		}

		// Check description regex
		if passed && descRe != nil && !descRe.MatchString(item.Description) {
			passed = false
			rejectReason = fmt.Sprintf("설명 필터 미충족: /%s/", req.Filters.Description)
		}

		// Check not_description regex
		if passed && notDescRe != nil && notDescRe.MatchString(item.Description) {
			passed = false
			rejectReason = fmt.Sprintf("제외 설명 필터 매칭: /%s/", req.Filters.NotDescription)
		}

		// Check duration filters
		if passed && req.Filters != nil && item.Duration > 0 {
			if req.Filters.MinDuration != nil && item.Duration < int64(*req.Filters.MinDuration) {
				passed = false
				rejectReason = fmt.Sprintf("최소 재생시간 미달 (%d초 < %d초)", item.Duration, *req.Filters.MinDuration)
			} else if req.Filters.MaxDuration != nil && item.Duration > int64(*req.Filters.MaxDuration) {
				passed = false
				rejectReason = fmt.Sprintf("최대 재생시간 초과 (%d초 > %d초)", item.Duration, *req.Filters.MaxDuration)
			}
		}

		if passed {
			passedCount++
		}

		resultItems = append(resultItems, PreviewEpisodeItem{
			ID:           item.ID,
			Title:        item.Title,
			Description:  item.Description,
			Duration:     item.Duration,
			DurationStr:  formatDuration(item.Duration),
			Thumbnail:    item.Thumbnail,
			UploadDate:   item.UploadDate,
			URL:          item.URL,
			Passed:       passed,
			RejectReason: rejectReason,
		})
	}

	return &PreviewResult{
		SourceTitle: sourceTitle,
		TotalCount:  len(resultItems),
		PassedCount: passedCount,
		Episodes:    resultItems,
	}, nil
}
