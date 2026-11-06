---
name: git-commit-push
description: Validate changes, format conventional commit messages, seek user confirmation, and push safely to origin.
---

# Git Commit & Push Workflow

This skill standardizes the day-to-day commit and push process for `podsync-manager`, enforcing quality checks and safety principles.

## Workflow Steps

### 1. Inspect Changes & Check Sensitive Files
- Run `git status` and `git diff` to review all modified, untracked, and deleted files.
- **Safety Rule**: Ensure sensitive files (such as `.env`, credentials, private keys, or `.tmp` files) are NOT staged or tracked.

### 2. Verification & Type Checking
- If frontend files (`src/`, `package.json`, etc.) or Go files were modified:
  ```bash
  npm run check
  ```
- Ensure there are 0 errors and 0 warnings before proceeding.

### 3. Draft Commit Message & Seek User Approval
- Formulate a clear, conventional commit message (e.g., `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`).
- **MANDATORY**: Present the staged file list and the exact commit message to the user and obtain explicit confirmation before running `git commit` or `git push`.

### 4. Execute Commit & Push
- Stage specific files or all approved changes:
  ```bash
  git add <files>
  ```
  *(Note: Run with `BypassSandbox: true` if `.git/index.lock` creation is blocked by the environment sandbox)*
- Commit changes:
  ```bash
  git commit -m "<commit message>"
  ```
- Push to the current tracking branch (typically `origin main`):
  ```bash
  git push origin <branch>
  ```

### 5. Final Verification
- Run `git status` to verify the working tree is clean and up to date with the remote branch.
- Report the committed commit hash and summary to the user.
