---
name: project-release
description: Standardized release workflow for podsync-manager. Synchronizes version bumps across package.json and Go backend, runs build pipeline, seeks user approval, tags, creates GitHub Release, and monitors Docker build.
---

# Project Release Workflow

This skill guides the formal release process for `podsync-manager`, ensuring version synchronization across the Go backend and Svelte frontend, build verification, and automated Docker image deployment.

## Workflow Steps

### 1. Pre-Release Inspection
- Check current Git status: ensure the working tree is clean and on `main`:
  ```bash
  git status
  ```
- Identify the latest version tag:
  ```bash
  git tag -l --sort=-v:refname | head -n 5
  ```
- Determine the next version (default: semver patch bump, e.g., `v0.2.5` -> `v0.2.6`, unless specified otherwise).

### 2. Synchronize Version Numbers
The project is a Go single binary with an embedded Svelte SPA. Version numbers MUST be updated in both places:
1. `package.json`: `"version": "X.Y.Z"`
2. `internal/api/handlers_system.go`: `Version: "X.Y.Z"`

### 3. Full Build Pipeline Verification
Always verify the complete build pipeline according to `AGENTS.md`:
1. Type check:
   ```bash
   npm run check
   ```
2. Build frontend static SPA (`internal/web/dist`):
   ```bash
   npm run build
   ```
3. Compile Go single binary:
   ```bash
   go build -o podsync-manager ./cmd/server
   ```

### 4. Draft Release Notes & Seek User Confirmation
- Prepare the release notes summarizing all changes since the previous tag:
  - New features / enhancements
  - Bug fixes & architectural cleanups
  - UI / Localization updates
- **MANDATORY**: Present the target version (`vX.Y.Z`), release title, release notes, and planned actions to the user and obtain explicit approval before publishing.

### 5. Execute Release
Once approved:
1. Commit the version bump:
   ```bash
   git add package.json internal/api/handlers_system.go
   git commit -m "chore: bump version to vX.Y.Z"
   git push origin main
   ```
2. Create and push the Git tag (triggers GitHub Actions `docker-publish.yml`):
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
3. Publish GitHub Release via `gh`:
   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z - <Title>" --notes "<Notes>"
   ```

### 6. Monitor CI/CD Pipeline
- Verify that the GitHub Actions workflow was triggered by the tag push:
  ```bash
  gh run list -L 1
  ```
- Report the release URL and workflow status to the user.
