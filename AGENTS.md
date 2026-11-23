# Podsync Manager - AI Agent Guidelines

This document defines guidelines, milestones, and principles for AI coding agents developing `podsync-manager`.  
For detailed technical architecture and specifications, refer to [DESIGN.md](file:///Users/badugiss/work/badugisoft/podsync-manager/DESIGN.md).
For Golang single-binary architecture history, refer to [GOLANG_MIGRATION_PLAN.md](file:///Users/badugiss/work/badugisoft/podsync-manager/docs/GOLANG_MIGRATION_PLAN.md).

---

## 1. Core Technology Stack

- **Backend**: Go (`chi/v5`, `go-toml/v2`, Docker SDK, AWS SDK for Go v2) serving an embedded Svelte 5 SPA (`internal/web/dist`)
- **Frontend**: SvelteKit 2 / Svelte 5 (TypeScript, Tailwind CSS 4, `@sveltejs/adapter-static`)
- **Container Control**: Docker socket integration (`/var/run/docker.sock`)
- **Cloud Storage**: S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Wasabi) and local disk storage
- **Internationalization (i18n)**: 7 supported locales (`en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`) across `src/lib/i18n/locales/`, `site/i18n.js`, and `docs/README.<lang>.md`
- **Diff & In-Place Editor**: Side-by-side TOML diff comparison and live TOML editing

---

## 2. Milestone Roadmap

- [x] **Step 1 (Core)**: Administrator authentication (login/session), `config.toml` parsing/serialization, feed CRUD with atomic (`.tmp` -> `rename`) writes, `.bak` auto-backup and rollback.
- [x] **Step 2 (Docker)**: Docker socket integration, real-time container status monitoring, explicit restart deployment, SSE live log streaming, Config Diff review modal.
- [x] **Step 3 (S3 Media & Storage)**: S3 SDK integration for episode listing, in-browser audio streaming player, cost-optimized manual storage calculation with container credential auto-detection.
- [x] **Step 4 (Packaging & Dockerfile)**: Multi-stage Dockerfile build specification (~35MB Alpine image) and deployment validation.
- [x] **Step 5 (Multi-Language & UX Refinement)**:
  - 7-locale (EN, KO, JA, ZH, ES, FR, DE) modular i18n architecture.
  - Dark / Light / System theme modes with zero-flicker pre-render initialization and smooth transitions.
  - Smart pluralization, localized date formatting, and live countdown timers.
  - Comprehensive form internationalization across global settings and feed editor.
  - Live field modification badges and visual diff indicators.
  - Multi-language documentation (`docs/README.<lang>.md`), promotional landing page (`site/`), and community templates (`.github/`, `CONTRIBUTING.md`, `SECURITY.md`).

---

## 3. Repository Documentation & Community Files

- **Root `README.md`**: Kept in English with dynamic badges, language switcher bar, preview screenshot, privacy summary, and collapsible FAQ.
- **Localized `docs/README.<lang>.md`**: Synchronized translations (`ko`, `ja`, `zh`, `es`, `fr`, `de`) with `../` relative paths and localized `#anchor` links.
- **Promotional Site (`site/`)**: Zero-dependency 7-language GitHub Pages site (`site/index.html`, `site/styles.css`, `site/i18n.js`) deployed via `.github/workflows/pages.yml`.
- **Community Health**: `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `.github/ISSUE_TEMPLATE/`, and `.github/PULL_REQUEST_TEMPLATE.md`.

---

## 4. Agent Operating Principles

- **Latest Source Verification**: Before starting any task, always check whether the local repository is up to date with `origin/main` (`git fetch`) and sync if behind before proceeding.
- **Prior Notification**: Always clearly state what action will be taken before creating, editing files, or running commands.
- **Repository Modification Approval**: Never execute commits, pushes, or releases without explicit prior user confirmation.
- **English Git & Release Messages**: Always write all Git commit messages, release titles, and release notes in English.
- **Concise Communication**: Keep answers brief, direct, and strictly focused on what the user asks.
- **Automatic Server Execution on Task Completion**: Whenever app code or configuration changes are completed, always build and run/restart the test server following the `run-dev-server` skill workflow so the user can verify changes immediately at `http://localhost:3000/`.

---

## 5. Server Startup & Execution Protocol

When launching or restarting the local development/runtime server, always follow these rules in order:

1. **Pre-launch Port & Process Check**:
   - Always check port 3000 (`lsof -i :3000`) before starting the server.
   - If an old `podsync-manager` process is occupying port 3000, terminate it first. Never let the server silently fall back to port 3001.

2. **Single-Binary Build Pipeline**:
   - This project operates as a Go single binary with embedded Svelte 5 SPA (`internal/web/dist`).
   - If frontend changes were made:
     1. Build frontend: `npm run build`
     2. Build Go server: `go build -o podsync-manager ./cmd/server`
     3. Run binary: `./podsync-manager`
   - Do not merely run `npm run dev` (Vite) alone, as backend `/api` endpoints will be absent and cause frontend communication errors.

3. **Docker Socket Access Permission**:
   - The server inspects the `podsync` container via Docker socket (`/var/run/docker.sock` / OrbStack socket).
   - The server process must run with Docker socket access (sandbox bypass) to prevent `podsync: error` in container monitoring.
