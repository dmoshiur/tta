# Environment

See `.env.example`. Required in production: `DATABASE_URL` (Turso libsql URL), unpredictable `JWT_SECRET`, `PUBLIC_URL`, and `FRONTEND_URL`. `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` (or the legacy `ADMIN_EMAIL`/`ADMIN_PASSWORD`) are optional initial-seed inputs.

The **hacker admin** console (`/hackeradmin`) reads: `HACKER_ADMIN_ENABLED`, `HACKER_ADMIN_EMAIL` (where the hourly rotating passcode is e-mailed, default `mdmoshiurrahmanmohi1@gmail.com`), `HACKER_ADMIN_PASSCODE_TTL_MINUTES` (default `60`), `HACKER_ADMIN_DEV_PASSCODE` (development-only fallback) and the standard `SMTP_*` variables for delivery.

`VITE_API_URL` defaults to `/api/v1`. `MEDIA_BASE_URL` records the chosen external media origin; content APIs store provider-returned HTTPS URLs. Never commit real secrets.
