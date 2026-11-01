# Podsync Manager - AI Agent Guidelines

This document defines guidelines, milestones, and principles for AI coding agents developing `podsync-manager`.  
For detailed technical architecture and specifications, refer to [DESIGN.md](file:///Users/badugiss/work/badugisoft/podsync-manager/DESIGN.md).
For future Golang single-binary migration plans, refer to [GOLANG_MIGRATION_PLAN.md](file:///Users/badugiss/work/badugisoft/podsync-manager/docs/GOLANG_MIGRATION_PLAN.md).

---

## 1. Core Technology Stack

- **Framework**: SvelteKit 2 / Svelte 5 (TypeScript, Tailwind CSS)
- **Adapter**: `@sveltejs/adapter-node`
- **TOML**: `smol-toml`
- **Container Control**: `dockerode`
- **Cloud Storage**: `@aws-sdk/client-s3` (S3-compatible and local disk storage)
- **Internationalization (i18n)**: 7 supported locales (English, Korean, Japanese, Chinese, Spanish, French, German)
- **Diff & In-Place Editor**: `diff`, Side-by-Side comparison and live TOML editing

---

## 2. Milestone Roadmap

- [x] **Step 1 (Core)**: Administrator authentication (login/session), `config.toml` parsing/serialization (`smol-toml`), feed CRUD with atomic (`.tmp` -> `rename`) writes, `.bak` auto-backup and rollback.
- [x] **Step 2 (Docker)**: Dockerode socket integration, real-time container status monitoring, explicit restart deployment, SSE live log streaming, Config Diff review modal.
- [x] **Step 3 (S3 Media & Storage)**: S3 SDK integration for episode listing, in-browser audio streaming player, cost-optimized manual storage calculation with container credential auto-detection.
- [x] **Step 4 (Packaging & Dockerfile)**: Multi-stage Dockerfile build specification and deployment validation.
- [x] **Step 5 (Multi-Language & UX Refinement)**:
  - 7-locale (EN, KO, JA, ZH, ES, FR, DE) modular i18n architecture.
  - Dark / Light / System theme modes with zero-flicker pre-render initialization and smooth transitions.
  - Smart pluralization, localized date formatting, and live countdown timers.
  - Comprehensive form internationalization across global settings and feed editor.
  - Live field modification badges and visual diff indicators.
  - Modern documentation and SVG preview synchronization.

---

## 3. Agent Operating Principles

- **Prior Notification**: Always clearly state what action will be taken before creating, editing files, or running commands.
- **Repository Modification Approval**: Never execute commits, pushes, or releases without explicit prior user confirmation.
- **Concise Communication**: Keep answers brief, direct, and strictly focused on what the user asks.
