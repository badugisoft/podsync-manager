# Podsync Manager 🎙️

> **Modern Web Dashboard & Container Manager for [Podsync](https://github.com/mxpv/podsync)**  
> *Crafted and built with [Google Antigravity](https://deepmind.google/technologies/gemini/).*

---

[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.x-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Built with Antigravity](https://img.shields.io/badge/Built_with-Google_Antigravity-4285F4?style=flat&logo=google&logoColor=white)](#built-with-google-antigravity)

**Podsync Manager** is a premium, open-source dashboard designed to manage and monitor [Podsync](https://github.com/mxpv/podsync) — a service that turns YouTube channels and playlists into customized podcast feeds.

Without manually editing complex `config.toml` files, you can create and modify podcast feeds through an intuitive web interface, monitor Docker container status with live SSE log streaming, review configuration diffs before deployment, play audio episodes directly, and calculate cloud storage usage.

---

## 📸 Preview

![Podsync Manager Dashboard Preview](docs/images/dashboard-preview.svg)  
*(Sensitive credentials and private tokens are masked for security)*

---

## ✨ Key Features

### 1. 🎛️ Feed Lifecycle Management
- **Intuitive Feed Form**: Register podcast feeds easily with just a YouTube playlist or channel URL.
- **YouTube Optimized Presets**:
  - `format 18` (360p pre-merged single stream) preset: Zero server CPU re-encoding load, lightning-fast downloads, and minimal disk footprint.
  - Multi-language audio track priority specification (`-S lang:en/ko/ja`).
  - Android client emulation (`--extractor-args youtube:player-client=android`) to avoid YouTube bot bans and rate-limits.
  - Automatic exclusion of ongoing live streams (`--match-filter !is_live`).
- **Storage Conservation (Retention & Filters)**:
  - Automatic retention policy keeping only the latest $N$ episodes (`clean.keep_last`).
  - Minimum duration filter to exclude Shorts and short teasers (`filters.min_duration`).
  - Regex-based title and description inclusion/exclusion filters.
- **Atomic File Operations**: Safe writing to temporary files (`.tmp`) followed by atomic rename, accompanied by automatic `.bak` backups and one-click rollback.
- **Live TOML Generator & Change Highlighting**: Live preview and one-click clipboard copying of TOML snippets with real-time `Modified` visual badges on changed fields.

### 2. 🐳 Docker Container Control & Safe Deployment
- **Explicit Apply & Restart**: Saving configurations does not interrupt running services immediately; inspect changes and restart explicitly.
- **Config Diff Review & In-Place Editor**:
  - Side-by-side visual diff modal comparing running container configurations against staged changes.
  - Direct in-place TOML editor with syntax validation before applying.
- **Real-Time Container Status**: Real-time container health monitoring (`Running`, `Stopped`, `Restarting`) via the Docker socket.

### 3. 📜 Real-Time SSE Log Streaming
- **Timestamp & Log Level Badges**: Precise `YYYY-MM-DD HH:mm:ss` formatting with colored severity tags (`INFO`, `WARN`, `ERROR`).
- **Compact Attribute Formatting**: Inline contextual metadata (`feed_id`, `error`) maximizes readable screen space.
- **Smart Tools**: Level filters, keyword search, auto-scroll locking, and log buffer clearing with tail line limit selectors (100–1000 lines).

### 4. ☁️ S3-Compatible Cloud Storage & Media Player
- **Vendor-Neutral Storage**: Full compatibility with AWS S3, Cloudflare R2, MinIO, Wasabi, and local disk volumes.
- **Automatic Container Credential Detection**: Automatically discovers S3 access keys and endpoints directly from the running Podsync container environment.
- **Web Audio Player**: Stream podcast episodes with playback speed controls (1.0x–2.0x) and ±15s skip navigation.
- **On-Demand Storage Calculation**: Calculates total bucket usage and percentage against free tiers on click to eliminate recurring API querying costs.

### 5. 🌐 Multi-Language (i18n) Support
- **7 Supported Locales**: English (🇺🇸 default), Korean (🇰🇷), Japanese (🇯🇵), Simplified Chinese (🇨🇳), Spanish (🇪🇸), French (🇫🇷), and German (🇩🇪).
- **Client Persistence**: Seamless switching from the top navigation with automatic `localStorage` synchronization.
- **Smart Formatting**: Pluralization rules, localized date formatting, and live countdown timers customized per language.

### 6. 🔐 Security & Administration
- **Session Authentication**: Secure administrator authentication powered by environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
- **HTTP-Only Cookies**: Protected session cookies preventing unauthorized access.

---

## 🚀 Getting Started

### Docker Compose (Recommended)

Add Podsync Manager alongside Podsync in your `docker-compose.yml`:

```yaml
version: '3.8'

services:
  podsync:
    image: mxpv/podsync:latest
    container_name: podsync
    restart: unless-stopped
    volumes:
      - ./config/config.toml:/app/config/config.toml
      - ./data:/app/data
    environment:
      - TZ=Asia/Seoul
      - AWS_ACCESS_KEY_ID=your_access_key_id
      - AWS_SECRET_ACCESS_KEY=your_secret_access_key

  podsync-manager:
    image: ghcr.io/badugisoft/podsync-manager:latest
    container_name: podsync-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Mount Podsync configuration file
      - ./config/config.toml:/app/config/config.toml
      # Mount Docker socket for container control and log streaming
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PODSYNC_CONFIG_PATH=/app/config/config.toml
      - PODSYNC_CONTAINER_NAME=podsync
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - SESSION_SECRET=generate_a_random_secret_string
```

Run the stack:

```bash
docker compose up -d
```

Access the dashboard at `http://localhost:3000`.

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PODSYNC_CONFIG_PATH` | Absolute path to Podsync's `config.toml` | `/app/config/config.toml` |
| `PODSYNC_CONTAINER_NAME` | Name of the Podsync Docker container to manage | `podsync` |
| `DOCKER_SOCKET` | Path to Docker unix socket | `/var/run/docker.sock` |
| `ADMIN_USERNAME` | Administrator username | `admin` |
| `ADMIN_PASSWORD` | Administrator password | *(Recommended to set)* |
| `SESSION_SECRET` | Secret key used to encrypt session cookies | `podsync-manager-default-secret` |
| `PORT` | Web service port | `3000` |
| `AWS_ACCESS_KEY_ID` | Optional override for S3 access key (auto-detected from container if omitted) | `""` |
| `AWS_SECRET_ACCESS_KEY` | Optional override for S3 secret key (auto-detected from container if omitted) | `""` |

---

## 🛠️ Local Development

```bash
# Clone repository
git clone https://github.com/badugisoft/podsync-manager.git
cd podsync-manager

# Install dependencies
npm install

# Start development server
npm run dev

# Type check & Svelte diagnostics
npx svelte-check --tsconfig ./tsconfig.json

# Build for production
npm run build
```

---

## 🤖 Built with Google Antigravity

This project was architected and developed in collaboration with **[Google Antigravity](https://deepmind.google/technologies/gemini/)**, Google DeepMind's advanced agentic coding environment.

- **Architecture Design**: Modular full-stack design built on SvelteKit 2, Svelte 5 runes, TypeScript, and Tailwind CSS.
- **Iterative Implementation**:
  - **Core**: Session authentication, `smol-toml` parsing/serialization, atomic file writes with `.tmp` and `.bak` backups.
  - **Docker Integration**: Socket integration via `dockerode`, explicit restart pipeline, real-time SSE log streaming.
  - **Storage & Media**: Vendor-neutral S3 SDK integration, direct-streaming audio player, on-demand usage metering.
  - **Packaging & i18n**: Multi-stage production Dockerfile, 7-language reactive i18n architecture, and visual field change indicators.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.  
Podsync is created and maintained by [mxpv](https://github.com/mxpv/podsync).
