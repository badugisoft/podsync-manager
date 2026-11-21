# Podsync Manager

> **Modernes Web-Dashboard & Container-Manager für [Podsync](https://github.com/mxpv/podsync)**  
> *Entworfen und entwickelt mit [Google Antigravity](https://deepmind.google/technologies/gemini/).*

[![Latest Release](https://img.shields.io/github/v/release/badugisoft/podsync-manager?style=flat&logo=github)](https://github.com/badugisoft/podsync-manager/releases/latest)
[![Total Downloads](https://img.shields.io/github/downloads/badugisoft/podsync-manager/total?style=flat&logo=github)](https://github.com/badugisoft/podsync-manager/releases)
[![Go](https://img.shields.io/badge/Go-1.24%2B-00ADD8?style=flat&logo=go&logoColor=white)](https://go.dev/)
[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00?style=flat&logo=svelte&logoColor=white)](https://svelte.dev/)
[![Docker](https://img.shields.io/badge/Docker-amd64%20%7C%20arm64-2496ED?style=flat&logo=docker&logoColor=white)](https://github.com/badugisoft/podsync-manager/pkgs/container/podsync-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](../LICENSE)
[![Website](https://img.shields.io/badge/Website-GitHub_Pages-4F46E5?style=flat&logo=githubpages&logoColor=white)](https://badugisoft.github.io/podsync-manager/)

<p align="center">
  <a href="../README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.zh.md">简体中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.fr.md">Français</a> ·
  <strong>Deutsch</strong>
</p>

<p align="center">
  <a href="https://badugisoft.github.io/podsync-manager/?lang=de"><strong>🌐 Projekt-Website</strong></a> ·
  <a href="https://github.com/badugisoft/podsync-manager/releases/latest"><strong>📦 Neuestes Release</strong></a> ·
  <a href="#vorschau">Vorschau</a> ·
  <a href="#hauptfunktionen">Funktionen</a> ·
  <a href="#erste-schritte">Installation</a> ·
  <a href="#faq--fehlerbehebung">FAQ</a> ·
  <a href="#mitwirken">Mitwirken</a>
</p>

**Podsync Manager** ist ein schlankes, selbst gehostetes Go + Svelte 5 Web-Dashboard zur Verwaltung und Überwachung von [Podsync](https://github.com/mxpv/podsync) — einem Dienst, der YouTube-, Vimeo-, SoundCloud- und Twitch-Kanäle oder Playlists in Podcast-Feeds umwandelt.

Ohne `config.toml` manuell bearbeiten zu müssen, können Sie Feeds verwalten, TOML-Diffs vor dem Container-Neustart nebeneinander prüfen, Live-SSE-Docker-Protokolle streamen, den S3-Speicherverbrauch berechnen und Episoden direkt im Browser abspielen.

---

## Vorschau

![Podsync Manager Dashboard Vorschau](../assets/dashboard-preview.svg)  
*(Sensible Zugangsdaten und private Tokens werden aus Sicherheitsgründen automatisch maskiert.)*

---

## Hauptfunktionen

### 1. Feed-Lebenszyklus & YouTube-Optimierung
- **Intuitives Feed-Formular**: Feeds aus YouTube-, Vimeo-, SoundCloud- oder Twitch-URLs erstellen, bearbeiten oder klonen und Filterergebnisse vor dem Speichern testen.
- **YouTube-Voreinstellungen**:
  - `format 18` (vorgemuxter 360p-Stream): Keine CPU-Neukodierung auf dem Server, schnelle Downloads und minimaler Speicherbedarf.
  - Mehrsprachige Audiospur-Priorisierung (`-S lang:en/ko/ja`).
  - Android-Client-Emulation (`--extractor-args youtube:player-client=android`) gegen Bot-Erkennung und Ratenbegrenzung.
  - Automatischer Ausschluss von Livestreams (`!is_live`) und YouTube-Shorts-Richtlinien.
- **Aufbewahrung & Filter**: `clean.keep_last`, `filters.min_duration` / `max_duration` sowie Regex-Filter für Titel/Beschreibung.
- **Atomare Schreibvorgänge**: Temporäre `.tmp`-Dateien mit atomarem `rename`, automatischen `.bak`-Backups und Ein-Klick-Wiederherstellung.

### 2. Docker-Container-Steuerung & Diff-Prüfung
- **Explizites Anwenden & Neustarten**: Das Speichern unterbricht laufende Dienste nicht sofort; prüfen Sie Änderungen zuerst.
- **Side-by-Side-Diff & Direkter TOML-Editor**: Vergleichen Sie ausstehende Änderungen mit dem laufenden Container oder bearbeiten Sie TOML mit Syntaxprüfung.
- **Echtzeit-Containerstatus**: Laufende Statusüberwachung (`Aktiv`, `Gestoppt`, `Wird neu gestartet`) über den Docker-Socket.

### 3. Echtzeit-SSE-Protokoll-Streaming
- **Zeitstempel & Schweregrad-Badges**: `YYYY-MM-DD HH:mm:ss` mit `INFO`-, `WARN`- und `ERROR`-Markierungen.
- **Filter & Ansichten**: Level-Filter, Stichwortsuche, Zeilenanzahl (100–1000) sowie strukturierte oder Roh-Ansicht.

### 4. S3-kompatibler Speicher & Web-Audioplayer
- **Anbieterunabhängiger Speicher**: Kompatibel mit AWS S3, Cloudflare R2, MinIO, Wasabi und lokalem Speicher.
- **Automatische Zugangsdatenerkennung**: Erkennt S3-Schlüssel direkt aus dem laufenden Podsync-Container.
- **Web-Audioplayer**: Wiedergabegeschwindigkeit `1.0x–2.0x` und `±15s`-Sprünge.
- **On-Demand-Speicherberechnung**: Fragt Bucket-Nutzung nur auf Klick ab, um laufende API-Kosten zu vermeiden.

### 5. 7 Sprachen & Adaptive Themes
- **7 unterstützte Sprachen**: Englisch, Koreanisch, Japanisch, Chinesisch (vereinfacht), Spanisch, Französisch und Deutsch mit `localStorage`-Speicherung.
- **Hell / Dunkel / System**: Flimmerfreie Theme-Initialisierung.

### 6. Self-Hosted Privatsphäre & Sicherheit
- **100% lokal & keine Telemetrie**: Läuft ausschließlich in Ihrer eigenen Infrastruktur ohne jegliche Nutzungsanalyse.
- **Geschützter Zugang**: HTTP-Only-Session-Cookies (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) und maskierte Zugangsdaten. Siehe [SECURITY.md](../SECURITY.md).

---

## Erste Schritte

### Docker Compose (Empfohlen)

```yaml
services:
  podsync:
    image: mxpv/podsync:latest
    container_name: podsync
    restart: unless-stopped
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    environment:
      - TZ=Europe/Berlin
      - AWS_ACCESS_KEY_ID=your_access_key_id
      - AWS_SECRET_ACCESS_KEY=your_secret_access_key

  podsync-manager:
    image: ghcr.io/badugisoft/podsync-manager:latest
    container_name: podsync-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - PODSYNC_CONFIG_PATH=/app/config/config.toml
      - PODSYNC_CONTAINER_NAME=podsync
      - PODSYNC_YOUTUBE_API_KEY=your_youtube_api_key_here
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - SESSION_SECRET=generate_a_random_secret_string
      - AWS_ACCESS_KEY_ID=your_access_key_id
      - AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

Stack starten:

```bash
docker compose up -d
```

### Docker Run CLI

```bash
docker run -d \
  --name podsync-manager \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ./config:/app/config \
  -e ADMIN_PASSWORD=your_secure_password \
  ghcr.io/badugisoft/podsync-manager:latest
```

Rufen Sie `http://localhost:3000` im Browser auf.

### Lokaler Single-Binary-Build

```bash
git clone https://github.com/badugisoft/podsync-manager.git
cd podsync-manager
cp .env.example .env
npm install && npm run build
go build -o podsync-manager ./cmd/server
./podsync-manager
```

---

## Umgebungsvariablen

| Variable | Beschreibung | Standard |
| :--- | :--- | :--- |
| `PORT` | Webdienst-Port | `3000` |
| `PODSYNC_CONFIG_PATH` | Pfad zur `config.toml` von Podsync | `config/config.toml` (`/app/config/config.toml` im Container) |
| `PODSYNC_CONTAINER_NAME` | Name des Podsync-Containers | `podsync` |
| `PODSYNC_YOUTUBE_API_KEY` | YouTube Data API v3 Schlüssel | `""` |
| `DOCKER_SOCKET` | Pfad zum Docker-Unix-Socket | `/var/run/docker.sock` |
| `ADMIN_USERNAME` | Administrator-Benutzername | `admin` |
| `ADMIN_PASSWORD` | Administrator-Passwort | *(Empfohlen)* |
| `SESSION_SECRET` | Geheimer Schlüssel für Session-Cookies | *(Automatisch generiert falls leer)* |
| `AWS_ACCESS_KEY_ID` | S3 / Cloudflare R2 Access Key | `""` |
| `AWS_SECRET_ACCESS_KEY` | S3 / Cloudflare R2 Secret Key | `""` |

---

## Repository-Struktur

```text
podsync-manager/
├── cmd/server/             # Go-Server-Einstiegspunkt
├── internal/               # Go-Backend-Pakete & eingebettete SPA (dist)
├── src/                    # Svelte 5 / SvelteKit Frontend & 7-Sprachen-i18n
├── site/                   # Mehrsprachige GitHub-Pages-Landingpage
├── assets/                 # Gemeinsame Vorschaubilder & Icons
├── docs/                   # Lokalisierte README.<lang>.md & Architektur
├── .github/
│   ├── workflows/          # GHCR Docker-Publish & GitHub Pages Deploy
│   ├── ISSUE_TEMPLATE/     # Bug-Report- & Feature-Request-Vorlagen
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md         # Beitrags- & Build-Anleitung
├── SECURITY.md             # Sicherheits- & Datenschutzrichtlinie
├── LICENSE                 # MIT-Lizenz
└── Dockerfile              # Mehrstufiger Alpine-Build (~35 MB)
```

---

## FAQ & Fehlerbehebung

<details>
<summary><strong>Warum ./config statt config.toml direkt mounten?</strong></summary>

Das Mounten des übergeordneten Ordners (`-v ./config:/app/config`) ermöglicht temporäre `.tmp`-Dateien, atomares `rename` und `.bak`-Backups auf demselben Dateisystem ohne `EXDEV`-Fehler.
</details>

<details>
<summary><strong>Warum benötigt Podsync Manager Zugriff auf /var/run/docker.sock?</strong></summary>

Der Docker-Socket wird ausschließlich auf Ihrem Host verwendet, um den Containerstatus abzufragen, Live-SSE-Logs zu streamen, Podsync nach der Diff-Prüfung neu zu starten und S3-Zugangsdaten automatisch zu erkennen.
</details>

<details>
<summary><strong>Wie reduziert das YouTube-Format-18-Preset CPU-Last und Sperren?</strong></summary>

`format 18` lädt einen vorgemuxten 360p-Stream ohne `ffmpeg`-Neukodierung. Zusammen mit der Android-Client-Emulation beschleunigt es Downloads und vermeidet Ratenlimits.
</details>

<details>
<summary><strong>Wie werden S3-Zugangsdaten und API-Schlüssel geschützt?</strong></summary>

Sie können per Umgebungsvariable übergeben werden und werden in der UI maskiert. Sie verlassen niemals Ihren Host oder den konfigurierten S3-Endpunkt. Siehe [SECURITY.md](../SECURITY.md).
</details>

<details>
<summary><strong>Erfasst Podsync Manager Telemetriedaten?</strong></summary>

Nein. Es ist zu 100% selbst gehostet und erfasst keinerlei Telemetrie.
</details>

---

## Mitwirken

Beiträge sind willkommen! Bitte lesen Sie [CONTRIBUTING.md](../CONTRIBUTING.md), bevor Sie einen Pull Request eröffnen.

---

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz — siehe [LICENSE](../LICENSE).  
Podsync wird erstellt und gepflegt von [mxpv](https://github.com/mxpv/podsync).
