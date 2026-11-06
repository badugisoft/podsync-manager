---
name: run-dev-server
description: Safely launch or restart the podsync-manager test server. Manages port 3000 processes, builds Svelte SPA and Go single binary, verifies .env, and runs with Docker socket permissions.
---

# Test Server Startup Workflow

This skill standardizes launching or restarting the local development/runtime server for `podsync-manager`, preventing common pitfalls (port collisions, missing API backends, and container socket errors).

## Common Pitfalls & Rules

1. **Never fall back to port 3001**: Port 3000 MUST be checked and freed before starting.
2. **Never run `npm run dev` alone**: Vite dev server lacks Go `/api` backend endpoints, causing "Unable to communicate with server" errors. Always build the Go single-binary pipeline.
3. **Docker Socket Permission Required**: The Go server must run with Docker socket access (`BypassSandbox: true`) to avoid `podsync: error` when inspecting containers.
4. **Environment Variables**: The server reads local `.env` automatically via `internal/config/dotenv.go`.

---

## Workflow Steps

### 1. Pre-Launch Port & Process Inspection
- Check if port 3000 is occupied:
  ```bash
  lsof -i :3000
  ```
- If an existing `podsync-manager` process is occupying port 3000:
  - Terminate it using `kill <PID>` (run with `BypassSandbox: true` if host permissions are needed).
  - Verify port 3000 is completely released before proceeding.

### 2. Single-Binary Build Pipeline
If frontend changes (`src/`, `package.json`, etc.) or Go files were modified:
1. Build frontend static SPA (`internal/web/dist`):
   ```bash
   npm run build
   ```
2. Build Go single binary:
   ```bash
   go build -o podsync-manager ./cmd/server
   ```

### 3. Verify Local `.env`
- Ensure `.env` exists in the project root. If missing, copy from `.env.example`:
  ```bash
  cp .env.example .env
  ```
- Verify essential keys: `PORT=3000`, `PODSYNC_CONFIG_PATH`, `PODSYNC_YOUTUBE_API_KEY`.

### 4. Execute Server Process
- Start the server as a background daemon with Docker socket permissions:
  ```bash
  ./podsync-manager
  ```
  - **Tool parameters**: `IsDaemon: true`, `BypassSandbox: true`, `WaitMsBeforeAsync: 3000`.

### 5. Health Check & Verification
- Inspect recent process logs to ensure:
  - `.env` variables were loaded (e.g. `Loaded X environment variables from .env`)
  - Server is listening on `http://0.0.0.0:3000`
- Confirm URL to the user: `http://localhost:3000/`.
