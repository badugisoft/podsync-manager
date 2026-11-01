package api

import (
	"github.com/badugisoft/podsync-manager/internal/auth"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter() *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api", func(api chi.Router) {
		// Public auth endpoints
		api.Post("/auth/login", HandleLogin)
		api.Post("/auth/logout", HandleLogout)
		api.Get("/auth/me", HandleAuthMe)
		api.Get("/opml", HandleGetOPML)

		// Protected endpoints
		api.Group(func(protected chi.Router) {
			protected.Use(auth.RequireAuth)

			// System overview
			protected.Get("/system/overview", HandleSystemOverview)

			// Config
			protected.Get("/config", HandleGetConfig)
			protected.Put("/config", HandleSaveConfig)
			protected.Get("/config/raw", HandleGetRawToml)
			protected.Post("/config/raw", HandleSaveRawToml)
			protected.Get("/config/diff", HandleGetDiff)
			protected.Post("/config/rollback", HandleRollback)

			// Feeds
			protected.Get("/feeds", HandleListFeeds)
			protected.Post("/feeds", HandleCreateFeed)
			protected.Get("/feeds/check-id", HandleCheckFeedID)
			protected.Get("/feeds/{id}", HandleGetFeed)
			protected.Put("/feeds/{id}", HandleUpdateFeed)
			protected.Delete("/feeds/{id}", HandleDeleteFeed)
			protected.Get("/feeds/{id}/episodes", HandleGetFeedEpisodes)

			// Container control
			protected.Get("/container/status", HandleContainerStatus)
			protected.Post("/container/restart", HandleRestartContainer)
			protected.Get("/container/logs", HandleContainerLogs)

			// Storage
			protected.Post("/storage/calculate", HandleStorageCalculate)
			protected.Get("/storage/calculate", HandleStorageCalculate)
		})
	})

	return r
}
