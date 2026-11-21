## Summary

<!-- Describe what this PR changes and why. -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation / i18n update
- [ ] Refactor / chore

## Verification Checklist

- [ ] `npm run check` passes without errors
- [ ] `npm run build` succeeds (`internal/web/dist`)
- [ ] `go build -o podsync-manager ./cmd/server` succeeds
- [ ] Updated all 7 locales if UI text changed (`src/lib/i18n/locales/*.ts`)
- [ ] Updated `README.md` / `docs/README.*.md` if user-facing behavior changed
