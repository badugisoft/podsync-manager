# Podsync Manager

> **Tableau de bord Web Moderne & Gestionnaire de Conteneurs pour [Podsync](https://github.com/mxpv/podsync)**  
> *Conçu et développé avec [Google Antigravity](https://deepmind.google/technologies/gemini/).*

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
  <strong>Français</strong> ·
  <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://badugisoft.github.io/podsync-manager/?lang=fr"><strong>🌐 Site du Projet</strong></a> ·
  <a href="https://github.com/badugisoft/podsync-manager/releases/latest"><strong>📦 Dernière Version</strong></a> ·
  <a href="#aperçu">Aperçu</a> ·
  <a href="#fonctionnalités-clés">Fonctionnalités</a> ·
  <a href="#démarrage-rapide">Installation</a> ·
  <a href="#faq-et-dépannage">FAQ</a> ·
  <a href="#contribuer">Contribuer</a>
</p>

**Podsync Manager** est un tableau de bord web léger et auto-hébergé en Go + Svelte 5 conçu pour gérer et surveiller [Podsync](https://github.com/mxpv/podsync) — un service transformant les chaînes et playlists YouTube, Vimeo, SoundCloud et Twitch en flux de podcasts.

Sans éditer `config.toml` à la main, gérez vos flux, inspectez les diffs TOML côte à côte avant redémarrage, suivez les journaux Docker SSE en direct, calculez l'espace S3 et écoutez vos épisodes directement dans le navigateur.

---

## Aperçu

![Aperçu du tableau de bord Podsync Manager](../assets/dashboard-preview.svg)  
*(Les identifiants sensibles et jetons privés sont automatiquement masqués.)*

---

## Fonctionnalités clés

### 1. Cycle de vie des flux & Optimisation YouTube
- **Formulaire intuitif** : Créez, modifiez ou clonez des flux depuis YouTube, Vimeo, SoundCloud ou Twitch et prévisualisez le filtrage avant d'enregistrer.
- **Préréglages YouTube** :
  - `format 18` (flux 360p déjà muxé) : zéro réencodage CPU, téléchargements rapides et empreinte disque minimale.
  - Priorité de piste audio multilingue (`-S lang:en/ko/ja`).
  - Émulation client Android (`--extractor-args youtube:player-client=android`) pour éviter la détection de bots.
  - Exclusion automatique des directs (`!is_live`) et politiques YouTube Shorts.
- **Rétention & filtres** : `clean.keep_last`, `filters.min_duration` / `max_duration` et filtres regex sur titre/description.
- **Écritures atomiques** : Fichiers temporaires `.tmp` suivis d'un `rename` atomique, sauvegardes `.bak` et restauration en un clic.

### 2. Contrôle Docker & Revue Diff
- **Appliquer et redémarrer explicitement** : L'enregistrement n'interrompt pas le service ; vérifiez d'abord les changements.
- **Diff côte à côte & Éditeur TOML** : Comparez les changements en attente avec le conteneur actif ou éditez le TOML avec validation syntaxique.
- **État en temps réel** : Surveillance continue (`Actif`, `Arrêté`, `Redémarrage`) via le socket Docker.

### 3. Journaux SSE en temps réel
- **Horodatage et badges de gravité** : Format `YYYY-MM-DD HH:mm:ss` avec étiquettes `INFO`, `WARN`, `ERROR`.
- **Filtrage et vues** : Filtres par niveau, recherche par mots-clés, sélection de lignes (100–1000) et vues Structurée/Brute.

### 4. Stockage S3 & Lecteur audio Web
- **Stockage neutre** : Compatible AWS S3, Cloudflare R2, MinIO, Wasabi et disque local.
- **Détection auto des identifiants** : Détecte les clés S3 directement depuis l'environnement du conteneur Podsync.
- **Lecteur audio Web** : Contrôle de vitesse `1.0x–2.0x` et sauts `±15s`.
- **Calcul à la demande** : Interroge le bucket uniquement sur clic pour éviter les coûts API récurrents.

### 5. 7 langues & Thèmes adaptatifs
- **7 langues supportées** : Anglais, coréen, japonais, chinois simplifié, espagnol, français et allemand avec persistance `localStorage`.
- **Thèmes Clair / Sombre / Système** : Initialisation sans scintillement.

### 6. Confidentialité & Sécurité auto-hébergées
- **100% local et zéro télémétrie** : Fonctionne uniquement sur votre infrastructure sans aucune collecte de données.
- **Accès protégé** : Cookies de session HTTP-only (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) et identifiants masqués. Voir [SECURITY.md](../SECURITY.md).

---

## Démarrage rapide

### Docker Compose (Recommandé)

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
      - TZ=Europe/Paris
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

Lancer la pile :

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

Accédez au tableau de bord sur `http://localhost:3000`.

### Compilation locale (Binaire unique)

```bash
git clone https://github.com/badugisoft/podsync-manager.git
cd podsync-manager
cp .env.example .env
npm install && npm run build
go build -o podsync-manager ./cmd/server
./podsync-manager
```

---

## Variables d'environnement

| Variable | Description | Défaut |
| :--- | :--- | :--- |
| `PORT` | Port du service web | `3000` |
| `PODSYNC_CONFIG_PATH` | Chemin vers `config.toml` de Podsync | `config/config.toml` (`/app/config/config.toml` en conteneur) |
| `PODSYNC_CONTAINER_NAME` | Nom du conteneur Podsync | `podsync` |
| `PODSYNC_YOUTUBE_API_KEY` | Clé YouTube Data API v3 | `""` |
| `DOCKER_SOCKET` | Chemin du socket Unix Docker | `/var/run/docker.sock` |
| `ADMIN_USERNAME` | Identifiant administrateur | `admin` |
| `ADMIN_PASSWORD` | Mot de passe administrateur | *(Recommandé)* |
| `SESSION_SECRET` | Clé secrète pour cookies de session | *(Auto-générée si absente)* |
| `AWS_ACCESS_KEY_ID` | Clé d'accès S3 / Cloudflare R2 | `""` |
| `AWS_SECRET_ACCESS_KEY` | Clé secrète S3 / Cloudflare R2 | `""` |

---

## Structure du dépôt

```text
podsync-manager/
├── cmd/server/             # Point d'entrée du serveur Go
├── internal/               # Paquets Go et SPA intégrée (dist)
├── src/                    # Frontend Svelte 5 / SvelteKit & i18n (7 langues)
├── site/                   # Site vitrine multilingue GitHub Pages
├── assets/                 # Graphiques d'aperçu et icônes partagées
├── docs/                   # README.<lang>.md localisés et documentation
├── .github/
│   ├── workflows/          # Publication GHCR et déploiement GitHub Pages
│   ├── ISSUE_TEMPLATE/     # Modèles de rapport de bug et fonctionnalité
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md         # Guide de contribution et compilation
├── SECURITY.md             # Politique de sécurité et confidentialité
├── LICENSE                 # Licence MIT
└── Dockerfile              # Build Alpine multi-étapes (~35 Mo)
```

---

## FAQ et dépannage

<details>
<summary><strong>Pourquoi monter ./config plutôt que config.toml directement ?</strong></summary>

Monter le dossier parent (`-v ./config:/app/config`) permet d'écrire les fichiers temporaires `.tmp`, d'effectuer le `rename` atomique et de créer les sauvegardes `.bak` sur le même système de fichiers sans erreur `EXDEV`.
</details>

<details>
<summary><strong>Pourquoi Podsync Manager a-t-il besoin de /var/run/docker.sock ?</strong></summary>

Le socket Docker est utilisé uniquement sur votre hôte pour surveiller l'état du conteneur, diffuser les journaux SSE en direct, redémarrer Podsync après revue du Diff et détecter les clés S3.
</details>

<details>
<summary><strong>Comment le préréglage format 18 évite-t-il la charge CPU et les blocages ?</strong></summary>

`format 18` télécharge un flux 360p déjà muxé sans réencodage `ffmpeg`. Combiné à l'émulation Android, il accélère le téléchargement et évite les limites anti-bot.
</details>

<details>
<summary><strong>Comment les identifiants S3 et clés API sont-ils protégés ?</strong></summary>

Ils peuvent être injectés via variables d'environnement et sont masqués dans l'interface. Ils ne quittent jamais votre hôte ni votre point de terminaison S3. Voir [SECURITY.md](../SECURITY.md).
</details>

<details>
<summary><strong>Podsync Manager collecte-t-il de la télémétrie ?</strong></summary>

Non. Il est 100% auto-hébergé et ne collecte aucune télémétrie.
</details>

---

## Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](../CONTRIBUTING.md) avant d'ouvrir une pull request.

---

## Licence

Ce projet est sous licence MIT — voir [LICENSE](../LICENSE).  
Podsync est créé et maintenu par [mxpv](https://github.com/mxpv/podsync).
