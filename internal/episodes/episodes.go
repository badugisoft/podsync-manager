package episodes

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/badugisoft/podsync-manager/internal/config"
)

type RSSXML struct {
	XMLName xml.Name   `xml:"rss"`
	Channel RSSChannel `xml:"channel"`
}

type RSSImage struct {
	URL string `xml:"url"`
}

type ITunesImage struct {
	Href string `xml:"href,attr"`
}

type Enclosure struct {
	URL    string `xml:"url,attr"`
	Length string `xml:"length,attr"`
	Type   string `xml:"type,attr"`
}

type RSSItem struct {
	GUID        string      `xml:"guid"`
	Title       string      `xml:"title"`
	Description string      `xml:"description"`
	PubDate     string      `xml:"pubDate"`
	Duration    string      `xml:"duration"`
	ITunesImage ITunesImage `xml:"http://www.itunes.com/dtds/podcast-1.0.dtd image"`
	Enclosure   Enclosure   `xml:"enclosure"`
}

type RSSChannel struct {
	Title       string      `xml:"title"`
	Description string      `xml:"description"`
	Link        string      `xml:"link"`
	Image       RSSImage    `xml:"image"`
	ITunesImage ITunesImage `xml:"http://www.itunes.com/dtds/podcast-1.0.dtd image"`
	Items       []RSSItem   `xml:"item"`
}

type EpisodeItem struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	PubDate     string  `json:"pubDate"`
	Duration    string  `json:"duration,omitempty"`
	Thumbnail   string  `json:"thumbnail,omitempty"`
	AudioURL    string  `json:"audioUrl"`
	FileSize    string  `json:"fileSize,omitempty"`
	Bytes       *int64  `json:"bytes,omitempty"`
}

type ChannelMeta struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image,omitempty"`
	Link        string `json:"link,omitempty"`
}

type FeedEpisodesResult struct {
	Channel  ChannelMeta   `json:"channel"`
	Episodes []EpisodeItem `json:"episodes"`
}

func FetchFeedEpisodes(ctx context.Context, feedID string) (*FeedEpisodesResult, error) {
	cfg, _, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	hostname := "http://localhost:8080"
	if cfg.Server != nil && cfg.Server.Hostname != "" {
		hostname = cfg.Server.Hostname
	}
	cleanHostname := strings.TrimRight(hostname, "/")
	xmlURL := fmt.Sprintf("%s/%s.xml", cleanHostname, feedID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, xmlURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "PodsyncManager/0.2.0")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		return &FeedEpisodesResult{
			Channel:  ChannelMeta{Title: feedID},
			Episodes: []EpisodeItem{},
		}, nil
	}
	defer res.Body.Close()

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return &FeedEpisodesResult{
			Channel:  ChannelMeta{Title: feedID},
			Episodes: []EpisodeItem{},
		}, nil
	}

	var rss RSSXML
	if err := xml.Unmarshal(bodyBytes, &rss); err != nil {
		return &FeedEpisodesResult{
			Channel:  ChannelMeta{Title: feedID},
			Episodes: []EpisodeItem{},
		}, nil
	}

	channelImg := rss.Channel.ITunesImage.Href
	if channelImg == "" {
		channelImg = rss.Channel.Image.URL
	}
	if channelImg == "" && len(rss.Channel.Items) > 0 {
		channelImg = rss.Channel.Items[0].ITunesImage.Href
	}

	// 사용자 피드 설정에 custom이 있으면 커스텀 메타 적용
	feedCfg := cfg.Feeds[feedID]
	channelTitle := rss.Channel.Title
	if channelTitle == "" {
		channelTitle = feedID
	}
	if feedCfg != nil && feedCfg.Custom != nil {
		if feedCfg.Custom.Title != "" {
			channelTitle = feedCfg.Custom.Title
		}
		if feedCfg.Custom.CoverArt != "" {
			channelImg = feedCfg.Custom.CoverArt
		}
	}

	channelMeta := ChannelMeta{
		Title:       channelTitle,
		Description: rss.Channel.Description,
		Image:       channelImg,
		Link:        rss.Channel.Link,
	}

	var episodes []EpisodeItem
	for i, item := range rss.Channel.Items {
		epID := item.GUID
		if epID == "" {
			epID = fmt.Sprintf("ep-%d", i)
		}

		var fileSize string
		var bytesNum *int64
		if item.Enclosure.Length != "" {
			if b, err := strconv.ParseInt(item.Enclosure.Length, 10, 64); err == nil && b > 0 {
				bytesNum = &b
				if b >= 1024*1024*1024 {
					fileSize = fmt.Sprintf("%.2f GB", float64(b)/(1024*1024*1024))
				} else {
					fileSize = fmt.Sprintf("%.1f MB", float64(b)/(1024*1024))
				}
			}
		}

		thumb := item.ITunesImage.Href
		if thumb == "" {
			thumb = channelImg
		}

		episodes = append(episodes, EpisodeItem{
			ID:          epID,
			Title:       item.Title,
			Description: item.Description,
			PubDate:     item.PubDate,
			Duration:    item.Duration,
			Thumbnail:   thumb,
			AudioURL:    item.Enclosure.URL,
			FileSize:    fileSize,
			Bytes:       bytesNum,
		})
	}

	return &FeedEpisodesResult{
		Channel:  channelMeta,
		Episodes: episodes,
	}, nil
}
