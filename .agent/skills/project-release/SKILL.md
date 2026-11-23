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
- Identify the latest version tag and review `CHANGELOG.md` (`## [Unreleased]`):
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

### 4. Update CHANGELOG.md & Seek User Confirmation
- Review commits since the previous tag (`git log <prev_tag>..HEAD --oneline`).
- Update `CHANGELOG.md` in **English** (Keep a Changelog format):
  - Move items from `## [Unreleased]` into a new `## [vX.Y.Z] - YYYY-MM-DD` section (categorized under `Added`, `Changed`, `Fixed`, etc.), and leave `## [Unreleased]` empty for future work.
  - Update the comparison links at the bottom of `CHANGELOG.md`:
    ```markdown
    [Unreleased]: https://github.com/badugisoft/podsync-manager/compare/vX.Y.Z...HEAD
    [vX.Y.Z]: https://github.com/badugisoft/podsync-manager/compare/<prev_tag>...vX.Y.Z
    ```
- **MANDATORY**: Present the target version (`vX.Y.Z`), `CHANGELOG.md` diff, and planned actions to the user and obtain explicit approval before committing or tagging.

### 5. Execute Release
Once approved:
1. Commit the version bump, `CHANGELOG.md`, and any updated `internal/web/dist` assets:
   ```bash
   git add package.json internal/api/handlers_system.go CHANGELOG.md
   git commit -m "chore: bump version to vX.Y.Z"
   git push origin main
   ```
2. Create and push the Git tag (triggers `.github/workflows/release.yml` to build/push Docker images and then automatically create the GitHub Release from `CHANGELOG.md` with a Full Changelog comparison link):
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

### 6. Monitor CI/CD Pipeline
- Verify that the `Release & Publish Docker Image` workflow (`release.yml`) was triggered by the tag push:
  ```bash
  gh run list -L 2
  ```
- Report the release URL (including the compare link) and workflow status to the user.
