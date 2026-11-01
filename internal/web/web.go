package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

//go:embed all:dist
var distFS embed.FS

// RegisterSPAHandler serves static assets from embedded FS with SPA fallback to index.html.
func RegisterSPAHandler(r chi.Router) {
	subFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic("failed to create sub filesystem from embedded dist: " + err.Error())
	}

	fileServer := http.FileServer(http.FS(subFS))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		// Check if file exists in embedded filesystem
		f, err := subFS.Open(path)
		if err == nil {
			stat, err := f.Stat()
			_ = f.Close()
			if err == nil && !stat.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Fallback to index.html for client-side SPA routing
		indexData, err := fs.ReadFile(subFS, "index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(indexData)
	})
}
