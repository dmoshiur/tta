# Render deployment

Use `render.yaml` to create the web service. The database is external: create a **Turso** database (`turso db create thinktank`, then `turso db show thinktank --url` and `turso db tokens create thinktank`) and set `DATABASE_URL` to the returned `libsql://` URL and `TURSO_AUTH_TOKEN` to the token — Render's managed PostgreSQL is no longer used.

Set both public URL values to the final HTTPS service URL. Also set `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` (admin console owner, seeded on first boot), `HACKER_ADMIN_EMAIL` (hourly passcode recipient) and the `SMTP_*` variables used to deliver the passcode e-mail.

Build is `npm ci && npm run build`; start is `npm start`; health is `/api/health`. The server binds `0.0.0.0:$PORT`. Production has no generated localhost URL. Media uploads go to the project's **Storage Gateway** (`STORAGE_DRIVER=gateway`, `STORAGE_GATEWAY_URL=https://st.thamjj13.top/api/v1` — both preset in `render.yaml`); set `STORAGE_GATEWAY_KEY_ID` and `STORAGE_GATEWAY_KEY_SECRET` in the Render dashboard. The boot log prints `storage: gateway ready` once the gateway's health probe succeeds. Note that the gateway accepts PDF documents only; ephemeral local uploads are intended only for development.

After deploy: check health, verify the first passcode e-mail arrives at `HACKER_ADMIN_EMAIL`, open `/hackeradmin`, log in, and confirm the console shows traffic. Then create/login the initial admin, rotate or remove the seed `SUPER_ADMIN_PASSWORD`, create categories/content, verify sitemap/robots, enrollment, quiz submission, and mobile layouts.
