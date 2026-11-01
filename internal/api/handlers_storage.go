package api

import (
	"net/http"

	"github.com/badugisoft/podsync-manager/internal/storage"
)

func HandleStorageCalculate(w http.ResponseWriter, r *http.Request) {
	stats, err := storage.CalculateStorageUsage(r.Context())
	if err != nil {
		JSON(w, http.StatusInternalServerError, map[string]any{
			"ok":   false,
			"code": err.Error(),
		})
		return
	}
	JSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"stats": stats,
	})
}
