# Podsync Manager - System Design Specification

This document defines the architectural decisions, operational specifications, and implementation details of `podsync-manager`.  
This project was designed and built in collaboration with the **Google Antigravity** coding assistant.

---

## 1. Technology Stack & Runtime

- **Framework**: SvelteKit 2 / Svelte 5 (TypeScript, Tailwind CSS)
- **Adapter**: `@sveltejs/adapter-node` (Single lightweight Node container runtime)
- **TOML Parser/Serializer**: `smol-toml` (Full TOML v1.0 specification compatibility)
- **Container Control**: `dockerode` (Direct communication over `/var/run/docker.sock` Unix socket)
- **Storage SDK**: `@aws-sdk/client-s3` (Compatible with AWS S3, Cloudflare R2, MinIO, Wasabi, and local disk volumes)
- **Icons**: `@lucide/svelte`
- **Diff Engine**: `diff` (Side-by-side unified text diffing)

---

## 2. Core Operational Policies & Specifications

### 2.0. Authentication
- **Environment Variables**:
  - `ADMIN_USERNAME`: Administrator username (default: `admin`)
  - `ADMIN_PASSWORD`: Administrator password
  - `SESSION_SECRET`: Session signature secret key
- **Implementation**:
  - Dedicated login screen (`/login`)
  - Session persistence via secure HTTP-only cookies
  - Automatic redirection of unauthorized requests enforced via SvelteKit `hooks.server.ts`

### 2.1. Configuration Management (`config.toml`)
- **Supported Providers**:
  - **YouTube**: Primary supported provider in the current release
  - Vimeo & SoundCloud: Marked as "Coming Soon" in the feed creation UI
- **Feed Schema & Form Options**:
  - **Basic Info**:
    - Feed ID (`feed_id`): Unique lowercase alphanumeric identifier with underscore (`_`), verified via real-time duplicate check API
    - URL (`url`): YouTube playlist or channel address
    - Media Format (`format`): `audio` / `video` (default: `audio`)
    - Quality (`quality`): `low` / `high` (default: `low`)
    - Page Size (`page_size`): Number of recent videos to query (default: 10)
    - Sync Period (`update_period`): `5m`, `15m`, `1h`, `1d` or cron expression (`cron_schedule`)
    - OPML Inclusion (`opml`): Independent toggle card above basic info (default: `true`)
  - **Retention & Filters**:
    - Episode Retention (`clean.keep_last`): Maximum episodes preserved
    - Minimum Duration (`filters.min_duration`): Duration in seconds to filter out short videos/Shorts (default: 180s)
    - Advanced Filters: Maximum duration, title/description regex inclusion and exclusion filters
  - **YouTube Optimization Presets (`youtube_dl_args`)**:
    - Stream Format: `-f 18` (360p pre-merged single stream eliminating server CPU re-encoding)
    - Audio Language Preference: `-S lang:en` / `ko` / `ja`
    - Client Emulation: `--extractor-args youtube:player-client=android` (prevents bot blocks and IP bans)
    - Live Stream Exclusion: `--match-filter !is_live`
  - **Custom Podcast Metadata (`custom`)**:
    - Custom cover art URL, title/description overrides, author name, iTunes category, explicit content flag
- **Atomic Writes, Fallbacks & Backups**:
  - Writes staged to temporary files (`.tmp`) before atomic `fs.rename` replacement within the mounted directory
  - Automatic in-place fallback write on Docker single-file mounts (`EXDEV`, `EBUSY`, `EPERM`) to preserve file inode binding
  - Automatic `.bak` backup preserved before every write, supporting instant rollback
- **Real-Time Visual Change Indicators**:
  - Live comparison against initial snapshot values
  - Inline `Modified` badges on changed field labels and highlight borders on altered inputs
  - Live TOML snippet generation with one-click clipboard copying

### 2.2. Container Control & Staged Deployment (Apply & Restart)
- **Explicit Restart Policy**:
  - Saving form fields does not restart the running Podsync container automatically
  - Users inspect staged changes and trigger explicit restarts via the **[Apply & Restart]** header action
- **Config Diff Review & In-Place Editor**:
  - Side-by-side visual diff modal comparing the running container configuration against staged file changes
  - Integrated in-place editor with syntax validation for emergency adjustments before restart

### 2.3. Real-Time SSE Log Streaming
- **Docker Integration**: Mounted `/var/run/docker.sock` Unix socket
- **Pipeline**:
  - Dedicated SvelteKit Server-Sent Events endpoint (`/api/container/logs`) relays Dockerode container output
  - Formatted timestamps (`YYYY-MM-DD HH:mm:ss`), severity color badges, and compact inline contextual variables
  - Configurable tail buffers (100–1000 lines), keyword search, level filters, and auto-scroll locking

### 2.4. Cloud Storage & Media Streaming
- **Vendor-Neutral Storage**:
  - Supports S3-compatible cloud providers (AWS S3, Cloudflare R2, MinIO) and container local directories (`/app/data`)
- **Auto Container Credential Inheritance**:
  - Dynamically extracts `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_ENDPOINT` from the running Podsync container if not explicitly configured in Manager
- **Episode Streaming**:
  - Parses channel RSS feeds (`${server.hostname}/${feed_id}.xml`) utilizing CDN cache to minimize cloud storage API fees
  - In-browser HTML5 audio player with variable playback speed (1.0x–2.0x) and ±15s seek navigation
- **On-Demand Storage Calculation**:
  - Manual usage calculation invokes `ListObjectsV2` only when clicked, eliminating continuous polling costs

### 2.5. Internationalization (i18n)
- **Supported Locales**: English (`en`, default), Korean (`ko`), Japanese (`ja`), Simplified Chinese (`zh`), Spanish (`es`), French (`fr`), and German (`de`)
- **Architecture**:
  - Independent locale resource modules located in `src/lib/i18n/locales/`
  - Svelte 5 reactive store (`i18n.locale`, `setLocale()`, `t()`)
  - Automatic synchronization with browser `localStorage`
  - Localized pluralization rules and countdown timers

---

## 3. Site Map & Navigation Architecture

```text
├── /login                                # Administrator login
└── (Authenticated Layout - Header: Container status badge, [Apply & Restart], Language selector, Logout)
    ├── / (Feed List & Storage Meter)     # Feed cards, OPML export, On-demand storage usage meter
    │   ├── /feeds/new                    # New feed creation & feed cloning
    │   ├── /feeds/[id]                   # Feed overview & episode list, Official RSS subscription banner
    │   │   └── /episodes/[episodeId]     # Episode details & direct audio streaming player
    │   └── /feeds/[id]/edit              # Feed configuration editor with change badges
    ├── /logs                             # Real-time SSE container log streaming console
    └── /settings                         # Global settings ([server], [storage], [tokens], etc.)
```

---

## 4. Container Deployment Specification

```yaml
version: '3.8'

services:
  podsync:
    image: mxpv/podsync:latest
    container_name: podsync
    restart: unless-stopped
    volumes:
      # Mount directory containing config.toml
      - ./config:/app/config
      - ./data:/app/data

  podsync-manager:
    build: .
    container_name: podsync-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Mount configuration directory (Directory mapping is strongly recommended for atomic .tmp writes & .bak backups)
      - ./config:/app/config
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PODSYNC_CONFIG_PATH=/app/config/config.toml
      - PODSYNC_CONTAINER_NAME=podsync
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=admin
```
