# Environment

See `.env.example`. Required in production: `DATABASE_URL` (Turso libsql URL) with `TURSO_AUTH_TOKEN` (the Turso database token — Turso authenticates with the token only, never with `user:password@` URLs; `?authToken=` in the URL is also accepted), unpredictable `JWT_SECRET`, `PUBLIC_URL`, and `FRONTEND_URL`. `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` (or the legacy `ADMIN_EMAIL`/`ADMIN_PASSWORD`) are optional initial-seed inputs.

The **hacker admin** console (`/hackeradmin`) reads: `HACKER_ADMIN_ENABLED`, `HACKER_ADMIN_EMAIL` (where the hourly rotating passcode is e-mailed, default `mdmoshiurrahmanmohi1@gmail.com`), `HACKER_ADMIN_PASSCODE_TTL_MINUTES` (default `60`), `HACKER_ADMIN_DEV_PASSCODE` (development-only fallback) and the standard `SMTP_*` variables for delivery.

**Media storage** is selected with `STORAGE_DRIVER` (`gateway` — the production default — `s3`, or `local`). The `gateway` driver talks to the project's own Storage Gateway (NGO File Cloud bridge) and reads `STORAGE_GATEWAY_URL` (e.g. `https://st.thamjj13.top/api/v1`), `STORAGE_GATEWAY_KEY_ID` (`ng_key_…`), `STORAGE_GATEWAY_KEY_SECRET` (`ng_live_…`, sent as `Authorization: Bearer`; `am_store_live_…` keys are sent as the X-AM dual-token headers instead) and `STORAGE_GATEWAY_TIMEOUT_MS`. The key must carry the `files:upload`, `files:download` and `files:delete` scopes. Stored links are `PUBLIC_URL/api/v1/media/<id>/<name>`, so `PUBLIC_URL` must be the real public origin. The gateway accepts PDF documents only. `MAX_UPLOAD_MB` caps upload size (default 5; the gateway allows up to 50).

`VITE_API_URL` defaults to `/api/v1`. Never commit real secrets — `.env` is git-ignored for that reason.
