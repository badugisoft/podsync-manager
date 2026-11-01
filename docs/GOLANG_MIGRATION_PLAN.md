# Golang Migration Plan & Architecture Specification

This document outlines the architectural blueprint, feasibility analysis, and phased implementation plan for migrating `podsync-manager` from a Node.js/SvelteKit server runtime to a **high-performance, ultra-lightweight Go (Golang) single binary** with an embedded Svelte 5 frontend.

---

## 1. Executive Summary & Objectives

### Current vs. Target Metrics

| Metric | Current (Node.js 24 + SvelteKit) | Target (Go + Embedded Svelte 5 SPA) | Improvement |
| :--- | :--- | :--- | :--- |
| **Container Image Size** | ~320 MB (`node:24-alpine` + `node_modules`) | **~25 MB** (`scratch` or minimal `alpine`) | **> 90% reduction** |
| **Idle Memory (RAM)** | ~80 – 110 MB | **~15 – 25 MB** | **~75% reduction** |
| **Cold Startup Time** | ~1.5 – 2.5s | **< 50ms** | **~98% faster** |
| **Architecture Harmony** | JavaScript runtime managing Go daemon | Native Go binary managing native Go daemon | **Zero runtime drift** |

---

## 2. Target Architecture

```
+----------------------------------------------------------------+
|                   Single Executable Binary                     |
|                                                                |
|  +---------------------------+  +---------------------------+  |
|  |     Embedded Assets       |  |      Go HTTP Router       |  |
|  |     (embed.FS)            |  |      (Chi / Standard)     |  |
|  |                           |  |                           |  |
|  |  • Svelte 5 SPA Build     |  |  • REST APIs              |  |
|  |  • Tailwind CSS v4 Bundle |  |  • Server-Sent Events     |  |
|  |  • i18n Locales (Client)  |  |  • Auth Cookie Middleware |  |
|  |  • Favicon SVG / PNG      |  |  • Static SPA Handler     |  |
|  +-------------+-------------+  +-------------+-------------+  |
+----------------|------------------------------|----------------+
                 |                              |
                 v                              v
      +---------------------+        +---------------------+
      |   Web Browser       |        | External Services   |
      |   (Desktop/Mobile)  |        |                     |
      |                     |        | • /var/run/docker   |
      |                     |        | • config.toml       |
      |                     |        | • AWS S3 / Local FS |
      +---------------------+        +---------------------+
```

---

## 3. Technology Stack Mapping

| Domain | Current Implementation | Target Go Equivalent |
| :--- | :--- | :--- |
| **HTTP Server / Router** | SvelteKit Server Endpoints | `net/http` + `github.com/go-chi/chi/v5` |
| **Docker Control** | `dockerode` (Node socket) | `github.com/docker/docker/client` (Official Go SDK) |
| **TOML Parser** | `smol-toml` (JS) | `github.com/pelletier/go-toml/v2` |
| **Cloud Storage** | `@aws-sdk/client-s3` (JS v3) | `github.com/aws/aws-sdk-go-v2/service/s3` |
| **Real-time Logs** | SSE via SvelteKit `ReadableStream` | Native `http.Flusher` SSE streaming in Go |
| **Session & Auth** | Node.js `crypto` HMAC-SHA256 cookie | Go `crypto/hmac` + `crypto/sha256` |
| **Static Asset Bundling** | SvelteKit Node Adapter | Go standard `//go:embed` filesystem |
| **Frontend UI** | SvelteKit 2 + Svelte 5 Runes | `@sveltejs/adapter-static` generating static SPA |

---

## 4. Key Implementation Components

### 4.1. Embedded Frontend (`embed.FS`)
Build Svelte 5 frontend with `@sveltejs/adapter-static` producing a pure `build/` static directory:
```go
//go:embed all:frontend/dist/*
var staticFS embed.FS
```

### 4.2. Docker SDK Integration
Replace `dockerode` with the official Docker Go SDK:
```go
import (
    "github.com/docker/docker/client"
    "github.com/docker/docker/api/types/container"
)

cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
```

### 4.3. High-Performance SSE Log Streamer
Stream Docker container logs directly to the browser with zero buffer copy:
```go
func StreamLogsHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    flusher, _ := w.(http.Flusher)

    reader, _ := dockerClient.ContainerLogs(ctx, containerID, container.LogsOptions{
        ShowStdout: true,
        ShowStderr: true,
        Follow:     true,
        Tail:       "200",
    })
    defer reader.Close()

    // stdcopy demux and flusher.Flush()
}
```

### 4.4. Atomic File Operations & Backup
Preserve the existing `.tmp` -> atomic rename -> `.bak` auto-backup pattern in Go:
```go
func SaveConfigAtomic(path string, data []byte) error {
    tmpPath := path + ".tmp"
    bakPath := path + ".bak"

    // 1. Create .bak backup
    copyFile(path, bakPath)

    // 2. Write to .tmp
    os.WriteFile(tmpPath, data, 0644)

    // 3. Atomic rename
    return os.Rename(tmpPath, path)
}
```

---

## 5. Phased Migration Roadmap

- [ ] **Phase 1: Frontend Decoupling**
  - Switch `@sveltejs/adapter-node` to `@sveltejs/adapter-static` with fallback to `index.html`.
  - Extract server API contracts into clean REST API endpoints (`/api/...`).
- [ ] **Phase 2: Go Backend Skeleton**
  - Initialize Go module (`go mod init github.com/badugisoft/podsync-manager`).
  - Implement authentication middleware, HMAC session cookie generation, and validation.
- [ ] **Phase 3: Core Features in Go**
  - TOML parser/serializer with atomic write and rollback.
  - Docker socket health check and restart deployment.
  - Real-time container log SSE streaming.
  - S3 / Local storage usage calculator.
- [ ] **Phase 4: Packaging & Validation**
  - Multi-stage Dockerfile compiling Go binary and embedding frontend.
  - Multi-platform image build (`linux/amd64`, `linux/arm64`) using `scratch` or `alpine`.
  - Verification of parity across all 7 languages and dark/light modes.
