# Security Considerations

## Authentication

- Passwords hashed with bcrypt (`passlib`), never stored or logged in plaintext.
- OTP codes are 6-digit, generated with `secrets.randbelow` (CSPRNG), hashed with a keyed SHA-256
  before storage, and never persisted or logged in plaintext in production code paths.
- OTPs expire (`OTP_EXPIRY_MINUTES`, default 5 min) and are rate-limited by attempt count
  (`OTP_MAX_ATTEMPTS`, default 5).
- JWT access tokens (short-lived) + refresh tokens (long-lived), signed with `SECRET_KEY`.
  **Rotate `SECRET_KEY` and set a real random value before any non-local deployment.**

## RBAC

Four roles: `admin`, `soc_analyst`, `security_manager`, `viewer`. Enforced server-side via
`app/api/deps.py::require_role`, backed by the `role_permissions` table in Postgres. New
self-registered accounts default to `viewer`; elevation is an explicit admin action.

## Audit logging

`app/services/audit_service.py::log_action` is called for registration, OTP verification, and
login today. Extend this call at every security-sensitive action added in later phases (rule
changes, IOC changes, incident status changes, case assignment, report generation, monitoring
enable/disable, admin actions) per spec §46. Audit logs are append-only and readable only by
`admin` (`/api/audit/logs`).

## Secrets

- All secrets load from environment variables (`backend/.env`, based on `.env.example`).
- `.env` is gitignored; only `.env.example` (with placeholder values) is committed.
- No database credentials, API keys, or internal secrets are ever sent to the frontend.

## External API failure handling

External threat-intel/AI providers are enrichments, never hard dependencies (Phase 8+, 17). When
implemented, failures must degrade gracefully (cached/local fallback, structured logging) rather
than raising to the user — see spec §51-53 for the required response shape.

## Live monitoring consent

The SentinelX Agent (Phase 5) must never start collecting network metadata without an explicit,
specific consent dialog (see spec §6). This is not yet implemented — the Settings page currently
shows only a "not yet implemented" placeholder, and no agent code exists in this scaffold.
