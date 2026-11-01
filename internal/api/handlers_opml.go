package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/badugisoft/podsync-manager/internal/config"
)

func HandleGetOPML(w http.ResponseWriter, r *http.Request) {
	cfg, _, err := config.LoadConfig()
	if err != nil {
		http.Error(w, "Failed to load config", http.StatusInternalServerError)
		return
	}

	hostname := "http://localhost:8080"
	if cfg.Server != nil && cfg.Server.Hostname != "" {
		hostname = cfg.Server.Hostname
	}
	cleanHostname := strings.TrimRight(hostname, "/")

	var outlines []string
	if cfg.Feeds != nil {
		for id, feed := range cfg.Feeds {
			if feed.OPML != nil && !*feed.OPML {
				continue
			}
			xmlURL := fmt.Sprintf("%s/%s.xml", cleanHostname, id)
			outlines = append(outlines, fmt.Sprintf(`    <outline text="%s" title="%s" type="rss" xmlUrl="%s" htmlUrl="%s" />`,
				id, id, xmlURL, feed.URL))
		}
	}

	xmlContent := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Podsync Subscriptions</title>
    <dateCreated>%s</dateCreated>
  </head>
  <body>
%s
  </body>
</opml>`, time.Now().UTC().Format(time.RFC1123), strings.Join(outlines, "\n"))

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="podsync-subscriptions.opml"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(xmlContent))
}
