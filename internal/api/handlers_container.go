package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/badugisoft/podsync-manager/internal/docker"
)

func HandleContainerStatus(w http.ResponseWriter, r *http.Request) {
	status := docker.GetPodsyncStatus(r.Context())
	JSON(w, http.StatusOK, status)
}

func HandleRestartContainer(w http.ResponseWriter, r *http.Request) {
	err := docker.RestartPodsync(r.Context())
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to restart container: "+err.Error())
		return
	}
	JSON(w, http.StatusOK, map[string]any{"success": true})
}

func HandleContainerLogs(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	tailParam := r.URL.Query().Get("tail")
	tail := "100"
	if tailParam != "" {
		if t, err := strconv.Atoi(tailParam); err == nil {
			if t < 10 {
				t = 10
			} else if t > 2000 {
				t = 2000
			}
			tail = strconv.Itoa(t)
		}
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	pr, pw := io.Pipe()
	ctx := r.Context()

	go func() {
		defer pw.Close()
		err := docker.StreamLogs(ctx, pw, tail, true)
		if err != nil {
			errMsg, _ := json.Marshal("[Docker Error] " + err.Error())
			_ = pw.CloseWithError(err)
			fmt.Fprintf(w, "data: %s\n\n", string(errMsg))
			flusher.Flush()
		}
	}()

	scanner := bufio.NewScanner(pr)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
			line := scanner.Text()
			if line != "" {
				b, _ := json.Marshal(line)
				fmt.Fprintf(w, "data: %s\n\n", string(b))
				flusher.Flush()
			}
		}
	}
}
