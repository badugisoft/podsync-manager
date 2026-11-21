# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `0.2.x` (Latest) | ✅ Yes |
| `< 0.2.0` | ❌ No |

## Privacy & Data-Flow Architecture

Podsync Manager is designed as a **100% self-hosted** management dashboard:

- **Zero Telemetry**: Podsync Manager does not collect, log, or transmit any usage analytics, crash reports, or telemetry to external servers.
- **Local Infrastructure Only**: Network communication occurs strictly between your browser, the `podsync-manager` server, the local Docker socket (`/var/run/docker.sock`), and your configured S3-compatible storage endpoint or YouTube metadata preview (`yt-dlp` inside the Podsync container).
- **Credential Handling & Masking**:
  - S3 keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and platform API tokens can be injected via environment variables.
  - Sensitive tokens and credentials are masked in the web UI and configuration previews.
- **Session Security**: Administrator login uses HTTP-only session cookies signed with `SESSION_SECRET`.
- **Atomic File Writes**: `config.toml` updates use temporary file writes (`.tmp`) followed by atomic `rename` operations and `.bak` backups to prevent partial or corrupted configurations.

## Reporting a Vulnerability

If you discover a security vulnerability in Podsync Manager:

1. **Do not** open a public GitHub issue with exploit details.
2. Report the issue privately via [GitHub Security Advisories](https://github.com/badugisoft/podsync-manager/security/advisories/new).
3. Include steps to reproduce, affected version, and potential impact. We will acknowledge receipt and work on a fix promptly.
