package episodes

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/badugisoft/podsync-manager/internal/config"
)

// ResolveYouTubeChannelURL converts YouTube @handle or custom URLs into canonical /channel/UC... URLs
func ResolveYouTubeChannelURL(ctx context.Context, rawURL string) string {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return trimmed
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return trimmed
	}

	host := strings.ToLower(parsed.Host)
	if !strings.Contains(host, "youtube.com") && !strings.Contains(host, "youtu.be") {
		return trimmed
	}

	pathParts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(pathParts) == 0 {
		return trimmed
	}

	// If already a canonical channel URL, return as is
	if pathParts[0] == "channel" && len(pathParts) >= 2 {
		return trimmed
	}

	// Check if path is a handle (e.g. /@3protv)
	handle := ""
	if strings.HasPrefix(pathParts[0], "@") {
		handle = pathParts[0]
	}

	if handle == "" {
		return trimmed
	}

	cfg, _, _ := config.LoadConfig()
	client := &http.Client{Timeout: 8 * time.Second}

	// 1. Try YouTube Data API if token is configured
	if cfg != nil && cfg.Tokens != nil && cfg.Tokens.YouTube != "" {
		apiURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=%s&key=%s",
			url.QueryEscape(handle), cfg.Tokens.YouTube)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err == nil {
			res, err := client.Do(req)
			if err == nil && res.StatusCode == http.StatusOK {
				defer res.Body.Close()
				var resp struct {
					Items []struct {
						ID string `json:"id"`
					} `json:"items"`
				}
				if json.NewDecoder(res.Body).Decode(&resp) == nil && len(resp.Items) > 0 && resp.Items[0].ID != "" {
					return fmt.Sprintf("https://www.youtube.com/channel/%s", resp.Items[0].ID)
				}
			}
		}
	}

	// 2. Fallback: fetch YouTube channel web page and extract channelId meta tag
	webURL := fmt.Sprintf("https://www.youtube.com/%s", handle)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, webURL, nil)
	if err != nil {
		return trimmed
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")

	res, err := client.Do(req)
	if err != nil {
		return trimmed
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusOK {
		bodyBytes, err := io.ReadAll(io.LimitReader(res.Body, 1024*1024)) // limit to 1MB
		if err == nil {
			body := string(bodyBytes)
			// Match <meta itemprop="channelId" content="UC..."> or "channelId":"UC..."
			re1 := regexp.MustCompile(`itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"`)
			if m := re1.FindStringSubmatch(body); len(m) > 1 {
				return fmt.Sprintf("https://www.youtube.com/channel/%s", m[1])
			}

			re2 := regexp.MustCompile(`"channelId":"(UC[a-zA-Z0-9_-]+)"`)
			if m := re2.FindStringSubmatch(body); len(m) > 1 {
				return fmt.Sprintf("https://www.youtube.com/channel/%s", m[1])
			}
		}
	}

	return trimmed
}
