# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.2.11] - 2026-11-23

### Added
- Full-page mock screenshots for all 10 application views in `assets/screenshots/` with all collapsible sections expanded.
- Multi-language GitHub Pages landing site (`site/`) and synchronized localized READMEs (`docs/README.<lang>.md`).
- Interactive screenshot tab switcher on the landing page and Cloudflare Web Analytics integration.
- `update-screenshots` project skill and automated headless Chrome capture script.
- Unified `.github/workflows/release.yml` workflow that builds Docker images and automatically creates GitHub Releases from `CHANGELOG.md` with Full Changelog comparison links.

### Changed
- Replaced the placeholder `dashboard-preview.svg` with real mock screenshots across `README.md`, `docs/`, and `site/`.
- Standardized English commit messages and release notes across `AGENTS.md` and project skills.
- Updated `git-commit-push` and `project-release` skills to integrate `CHANGELOG.md` and `release.yml`.

### Removed
- Removed standalone `.github/workflows/docker-publish.yml` (merged into `.github/workflows/release.yml`).

### Fixed
- Preserved original `youtube_dl_args` order and unmodified arguments when saving feed edits in `FeedForm.svelte`.

## [v0.2.10] - 2026-11-21

### Fixed
- Added mobile navigation bar and full-bleed favicons for better mobile and PWA support.

## [v0.2.9] - 2026-11-13

### Changed
- Condensed top navigation bar, improved light mode visibility, and made feed cards more compact.

## [v0.2.8] - 2026-11-13

### Added
- Added unified All Episodes list page (`/episodes`) and `/api/episodes` query endpoint.

## [v0.2.7] - 2026-11-09

### Fixed
- Applied timestamp-based cache busting to the episode audio player to prevent stale cached audio playback.

## [v0.2.6] - 2026-11-08

### Added
- Added feed and individual episode re-download support, plus multi-language audio track download optimization.
- Added agent workflow skills and automated test server execution protocol.

## [v0.2.5] - 2026-11-06

### Added
- Added `.env` file loading support and clean Docker container inspect fallback.

### Changed
- Refined default feed options.

## [v0.2.4] - 2026-11-03

### Added
- Added episode filter preview modal and automatic YouTube `@handle` URL resolution.

## [v0.2.3] - 2026-11-02

### Changed
- Release maintenance and version bump to `v0.2.3`.

## [v0.2.2] - 2026-11-02

### Performance
- Removed slow GitHub Actions cache export in Docker CI workflow to speed up multi-arch builds.

## [v0.2.1] - 2026-11-02

### Performance
- Optimized multi-arch Docker build with native cross-compilation.

## [v0.2.0] - 2026-11-02

### Changed
- Migrated backend from Node.js to a Go single binary serving an embedded Svelte 5 SPA.

## [v0.1.1] - 2026-11-01

### Fixed
- Supported single-file mount fallback and recommended directory volume mapping.

## [v0.1.0] - 2026-11-01

### Added
- Initial release of Podsync Manager.

[Unreleased]: https://github.com/badugisoft/podsync-manager/compare/v0.2.11...HEAD
[v0.2.11]: https://github.com/badugisoft/podsync-manager/compare/v0.2.10...v0.2.11
[v0.2.10]: https://github.com/badugisoft/podsync-manager/compare/v0.2.9...v0.2.10
[v0.2.9]: https://github.com/badugisoft/podsync-manager/compare/v0.2.8...v0.2.9
[v0.2.8]: https://github.com/badugisoft/podsync-manager/compare/v0.2.7...v0.2.8
[v0.2.7]: https://github.com/badugisoft/podsync-manager/compare/v0.2.6...v0.2.7
[v0.2.6]: https://github.com/badugisoft/podsync-manager/compare/v0.2.5...v0.2.6
[v0.2.5]: https://github.com/badugisoft/podsync-manager/compare/v0.2.4...v0.2.5
[v0.2.4]: https://github.com/badugisoft/podsync-manager/compare/v0.2.3...v0.2.4
[v0.2.3]: https://github.com/badugisoft/podsync-manager/compare/v0.2.2...v0.2.3
[v0.2.2]: https://github.com/badugisoft/podsync-manager/compare/v0.2.1...v0.2.2
[v0.2.1]: https://github.com/badugisoft/podsync-manager/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/badugisoft/podsync-manager/compare/v0.1.1...v0.2.0
[v0.1.1]: https://github.com/badugisoft/podsync-manager/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/badugisoft/podsync-manager/releases/tag/v0.1.0
