---
name: update-screenshots
description: Capture full-page privacy-safe screenshots for all routes using mock data, expanding all collapsed sections, and update docs and landing page references.
---

# Update Project Screenshots

This skill standardizes capturing fresh, privacy-safe, full-page screenshots for `podsync-manager` using a local mock API server and headless Chrome, without exposing real feeds, credentials, or personal data.

## Workflow Steps

### 1. Ensure Frontend Build Is Up to Date
The capture script serves the compiled Svelte SPA from `internal/web/dist/`. Whenever `src/` files have changed, rebuild first:
```bash
npm run build
```

### 2. Review Routes & Mock Data Coverage
Check `src/routes/` for any newly added pages, modals, or `<details>` sections:
- Current captured views in `scripts/capture_screenshots.mjs`:
  - `login.png` (`/login`)
  - `dashboard.png` (`/`, with storage usage calculated)
  - `config-diff-modal.png` (`/`, with Apply & Restart / Diff modal open)
  - `feed-detail.png` (`/feeds/tech-talks-daily`)
  - `feed-new.png` (`/feeds/new`)
  - `feed-edit.png` (`/feeds/tech-talks-daily/edit`)
  - `episodes.png` (`/episodes`)
  - `episode-player.png` (`/feeds/tech-talks-daily/episodes/ep-101`)
  - `logs.png` (`/logs`, SSE log stream)
  - `settings.png` (`/settings`)
- If new routes or API fields were added, update `.agent/skills/update-screenshots/scripts/capture_screenshots.mjs` with matching synthetic mock responses.

### 3. Capture All Screenshots
Run the capture script from the repository root (`BypassSandbox: true` is required because Node connects to Chrome's local DevTools WebSocket port):
```bash
node .agent/skills/update-screenshots/scripts/capture_screenshots.mjs
```
What the script guarantees:
- Forces English (`podsync_language = 'en'`) and dark theme (`podsync_theme = 'dark'`).
- Expands all `<details>` elements on every page before capturing.
- Uses `captureBeyondViewport: true` at `1440px` width (`2x` device scale factor) to capture full-page PNGs into `assets/screenshots/`.
- Uses 100% synthetic mock data and local SVG cover art (`/mock-art/*.svg`) with zero external network dependencies.

### 4. Visually Verify Captured Images
Inspect key screenshots (especially `dashboard.png`, `settings.png`, `logs.png`, `config-diff-modal.png`, and any newly added routes) using `read_file` to confirm:
- No blank or crashed pages.
- All `<details>` sections are expanded and legible.
- No personal data or real tokens appear.

### 5. Sync Documentation & Landing Page (If Screenshots Were Added/Renamed)
If you added new screenshot files or changed filenames:
- Update `README.md` and `docs/README.{ko,ja,zh,es,fr,de}.md` preview gallery tables.
- Update the `.preview-tabs` buttons in `site/index.html`.
