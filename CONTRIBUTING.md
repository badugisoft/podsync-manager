# Contributing to Podsync Manager

Thank you for your interest in contributing to **Podsync Manager**!

## Prerequisites

- **Go**: `1.24+` (module uses `go 1.27.3` in `go.mod`)
- **Node.js**: `24.x` (for building the Svelte 5 / SvelteKit SPA)
- **Docker**: Docker Engine or OrbStack (for testing container status, log streaming, and restarts)

## Local Development & Single-Binary Build

Podsync Manager compiles the Svelte 5 SPA into static assets (`internal/web/dist`) and embeds them into a single Go binary.

```bash
# 1. Clone the repository
git clone https://github.com/badugisoft/podsync-manager.git
cd podsync-manager

# 2. Configure local environment
cp .env.example .env

# 3. Install frontend dependencies & run type checks
npm install
npm run check

# 4. Build frontend static assets into internal/web/dist
npm run build

# 5. Build and run the Go single binary
go build -o podsync-manager ./cmd/server
./podsync-manager
```

## Internationalization (i18n) Guidelines

Podsync Manager supports **7 languages**: English (`en`), Korean (`ko`), Japanese (`ja`), Simplified Chinese (`zh`), Spanish (`es`), French (`fr`), and German (`de`).

When adding or modifying UI strings or documentation:

1. **App UI**: Update all 7 files under `src/lib/i18n/locales/` (`en.ts`, `ko.ts`, `ja.ts`, `zh.ts`, `es.ts`, `fr.ts`, `de.ts`).
2. **Promotional Site**: Update `site/i18n.js` alongside `site/index.html` and verify with:
   ```bash
   node <path-to-pages_helper.mjs> verify-i18n site/index.html site/i18n.js
   ```
3. **README Documentation**: Keep `README.md` (English) and all `docs/README.<lang>.md` files (`ko`, `ja`, `zh`, `es`, `fr`, `de`) synchronized.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Keep changes focused and ensure `npm run check`, `npm run build`, and `go test ./...` (where applicable) pass.
3. Follow [Conventional Commits](https://www.conventionalcommits.org/) in English (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
4. Complete the checklist in the Pull Request template before requesting review.
