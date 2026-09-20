# ThinkTank Academia

> **Learn • Think • Understand • Unite**  
> *A Learning & Knowledge Platform for Education, Ideas, and Humanity.*

---

## 1. Product Overview

ThinkTank Academia is a complete, multidisciplinary learning and knowledge platform built mobile-first. It synthesizes:
- **Education & LMS:** Structured multi-module courses with rich lessons, video integration, downloadable resources, assignments, and verified progression tracking.
- **Job Preparation:** Competitive recruitment question banks, timed model tests with negative marking, previous exam analysis, and focused modules across General Knowledge, Current Affairs, English, বাংলা, Mathematics, and ICT.
- **Academic Learning:** Foundational concept explanations, guided tutorials, worked problem solving, and evidence-based study techniques.
- **Books & Ideas:** Deep summaries, key arguments, historical context, practical applications, and critical reviews.
- **General Knowledge:** Rigorous explorations in history, natural sciences, technology, economics, psychology, and philosophy.
- **World Affairs & Geopolitics:** Balanced international relations and strategic analysis strictly categorised into **Fact, Analysis, and Opinion** with citations.
- **Humanity & Social Unity:** Cultivating active empathy, unconditional human dignity, moral courage, civic dialogue, diversity, and peaceful coexistence.
- **Assessment Engine:** Timed model tests, MCQ practice sets, autosave, question index navigation, instant scoring, and explanation reviews.
- **Editorial CMS & Operations:** Full role-based access control (Super Admin, Content Admin, Moderator, Analyst), media asset repository, dynamic homepage & navigation management, and broadcast notifications.

---

## 2. Technology Architecture

- **Backend:** Node.js (v22+), Express 5, TypeScript.
- **Database:** **Turso (libsql/SQLite)** over HTTPS in production via `@libsql/client`. For zero-configuration local development the API falls back to a local SQLite file (`./data/thinktank.sqlite`), and tests run on disposable in-memory SQLite. Idempotent migration and starter content seed on boot.
- **Security:** Bcrypt salted password hashing, signed JWT Bearer authentication, role-based permission enforcement, Helmet security headers, CORS origin allowlists, and rate limiting.
- **Operations:** A hidden emergency console at `/hackeradmin` (hourly rotating, e-mailed passcode) with a site on/off kill switch, live traffic & visitor monitoring, and admin/super-admin oversight. See §7.
- **Storage:** Pluggable storage abstraction supporting local storage for development and S3-compatible providers (Cloudflare R2, AWS S3, MinIO) for production.
- **Email & Push:** Transactional password reset emails via SMTP and push notification device token registration.
- **Frontend:** React 19, TypeScript, React Router 7, Vite 8.
- **Design System:** Deep Navy (`#071b33`), Gold (`#d4b274`), Cream (`#f7f2e8`), and Soft Blue (`#e9f0f8`) academic visual identity. Mobile-first responsive layouts tested from 320px to 1440px+.

---

## 3. Project Structure

```text
thinktank-academia/
├── backend/
│   ├── src/
│   │   ├── admin/             # Resource schema registry & publish timers
│   │   ├── db/                # Turso (libsql/SQLite) client, schema & starter seed library
│   │   ├── lib/               # Storage (S3/local), mail, traffic log, site switch, utilities
│   │   ├── middleware/        # JWT auth, role permissions, rate limiters, error handler
│   │   ├── pages/             # Standalone /hackeradmin operations console
│   │   ├── routes/            # Versioned API routes (auth, courses, quizzes, content, admin, hackeradmin)
│   │   ├── security/          # Password hashing, token signing, session cache
│   │   ├── services/          # Notifications, audit log & hacker-admin passcode rotation
│   │   ├── config.ts          # Central environment configuration
│   │   └── server.ts          # Express server lifecycle & SPA static server
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, Footer, MobileBottomNav, CourseCard, QuizCard, etc.
│   │   ├── context/           # AuthContext & ToastContext
│   │   ├── pages/             # Home, Courses, Books, Quizzes, Articles, Search, Static
│   │   │   ├── user/          # Login, Register, Dashboard, My Learning, Bookmarks, Profile
│   │   │   └── admin/         # Admin Dashboard, Resource List, Editor, Users, Roles, Settings
│   │   ├── types/             # Shared TypeScript domain models
│   │   ├── api.ts             # Typed REST API client
│   │   ├── main.tsx           # Application root & client routing
│   │   └── styles.css         # Complete mobile-first stylesheet
├── public/                    # PWA manifest, service worker, brand SVG icon
├── tests/                     # API integration test suite
├── docs/                      # Architectural & API specifications
├── .env.example               # Environment variable reference
├── render.yaml                # Render Blueprint deployment definition
└── vite.config.ts             # Vite development server & proxy configuration
```

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 20+ (tested on Node 22)
- npm 10+

### Installation & Run

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
   *(Without `DATABASE_URL`, the server automatically starts on a local SQLite file in `./data` so you can develop immediately with zero external dependencies. In production point `DATABASE_URL` at your Turso database (`libsql://your-db-your-org.turso.io`) and put the database auth token in `TURSO_AUTH_TOKEN`.)*

3. Start development servers:
   ```bash
   npm run dev
   ```
   - Web application: `http://localhost:5173`
   - REST API: `http://localhost:3000/api/v1`
   - Health endpoint: `http://localhost:3000/api/health`

4. Automated administrative seeding:
   If `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` are provided in `.env`, the system automatically provisions the initial Super Administrator on the first startup. (The legacy `ADMIN_EMAIL` / `ADMIN_PASSWORD` variables are still honoured.)

---

## 5. Development & Testing Commands

| Command | Action |
|---|---|
| `npm run dev` | Runs concurrently: backend API watcher and Vite frontend development server. |
| `npm run build` | Builds production frontend assets to `dist/`. |
| `npm start` | Launches production server (serves API and compiled client). |
| `npm test` | Runs the automated API test suite. |
| `npm run typecheck`| Runs TypeScript static type checking across backend and frontend. |

---

## 6. Production Deployment on Render

This repository is configured for one-click deployment using Render Blueprints (`render.yaml`).

1. Connect this repository to your Render account.
2. Render provisions the web service (`thinktank-academia`) running Node.js.
3. **Create the Turso database** (https://turso.io):
   ```bash
   npm i -g @turso/cli
   turso db create thinktank
   turso db show thinktank --url      # → DATABASE_URL
   turso db tokens create thinktank   # → TURSO_AUTH_TOKEN
   ```
4. Set environment variables in Render:
   - `DATABASE_URL`: Your Turso libsql URL (see above).
   - `TURSO_AUTH_TOKEN`: The Turso database auth token (Turso does not accept `user:password@` URLs).
   - `STORAGE_GATEWAY_KEY_ID` / `STORAGE_GATEWAY_KEY_SECRET`: Credentials for the project's Storage Gateway (`STORAGE_DRIVER=gateway`, `STORAGE_GATEWAY_URL=https://st.thamjj13.top/api/v1` are preset in `render.yaml`). See §6.1.
   - `PUBLIC_URL`: Your deployed HTTPS service URL (e.g., `https://thinktank-academia.onrender.com`).
   - `FRONTEND_URL`: Allowed CORS origin(s).
   - `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`: The Super Admin account that owns the admin console (seeded on first boot).
   - `HACKER_ADMIN_EMAIL`: Where the hourly `/hackeradmin` passcode is e-mailed (default `mdmoshiurrahmanmohi1@gmail.com`).
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD`: Required for passcode e-mails and password resets.
5. Health check:
   - Health path: `/api/health` returns `200 OK`.
6. Static & SPA Serving:
   - In production, Express automatically serves `dist/` and routes all non-API paths to `index.html`.

### 6.1 Media storage — the project's Storage Gateway

Uploads are stored on the project's own **Storage Gateway** — the "NGO File Cloud" Storage Bridge REST API (`STORAGE_DRIVER=gateway`, `STORAGE_GATEWAY_URL=https://st.thamjj13.top/api/v1`). The API authenticates every call with the key issued by the gateway dashboard: `ng_key_…`/`ng_live_…` keys are the gateway's *bearer* family and are sent as `Authorization: Bearer ng_live_…`; `am_store_live_…` keys (the bridge family) are sent as `X-AM-Storage-Key-Id` / `X-AM-Storage-Key-Secret`. The family is picked automatically from the key-id prefix. The key needs the `files:upload`, `files:download` and `files:delete` scopes.

- Documents up to 4 MB are sent with one multipart `POST /files`; larger documents use the gateway's presigned `init → PUT → complete` flow, so Vercel's function payload limit never applies.
- Objects stay **private** on the gateway. The app stores permanent links of the form `PUBLIC_URL/api/v1/media/<file-id>/<name>.pdf`; that route fetches a short-lived signed URL from the gateway (cached until just before it expires) and redirects to it. `…/media/<file-id>/meta` returns the file metadata.
- Deleting media moves the document to the gateway's Trash (`DELETE /files/<id>`), where the gateway's retention policy applies.
- **The gateway currently accepts PDF documents only** (extension, MIME type and `%PDF-` magic bytes are all verified server-side). Other file types — including avatar images — are rejected with a clear `400` error until the gateway is extended.
- On boot the server probes `GET /health` on the gateway and logs the result, so a wrong URL or a revoked key shows up immediately instead of on the first upload.

---

## 7. Hacker Admin — Emergency Operations Console (`/hackeradmin`)

A hidden, passcode-protected operations console for the site owner. It is a standalone page (no React build) served directly by the API and stays reachable **even while the site is switched off**.

**Access flow**
1. On boot — and automatically every `HACKER_ADMIN_PASSCODE_TTL_MINUTES` (default **60**, i.e. the passcode changes every hour) — the server generates a new 8-character passcode (`XXXX-XXXX`).
2. The code is **e-mailed via SMTP** to `HACKER_ADMIN_EMAIL` (default `mdmoshiurrahmanmohi1@gmail.com`). Only the SHA-256 hash is stored; the plaintext exists in the inbox and in memory.
3. Enter the code at `/hackeradmin` to open a 60-minute session. A wrong/expired code is rejected (10 attempts per 15 min per IP).

**Console capabilities**
- ⏻ **Site power switch** — turn the whole site ON/OFF. When OFF, every API call returns `503 SITE_OFFLINE` and visitors see an offline screen; health checks, uploads and `/hackeradmin` itself stay up so you can always switch back on.
- 📈 **Traffic** — requests per day (14 days), 2xx/3xx/4xx/5xx breakdown, API-vs-pages split, top paths, latest 50 requests.
- 👥 **Visitors** — unique-IP counts (1 h / 24 h / 7 d), visitors per day, top user agents, referrers and most-active IPs.
- 🛡 **Admins / Super Admin** — every administrator account with role & status, plus the `SUPER_ADMIN_EMAIL` configured in `.env`.
- 🗂 **Management** — platform statistics, admin activity log, force a new passcode now, send an SMTP test e-mail, shortcut to the full admin console (`/admin`).

All requests are recorded in the `request_log` table (7-day retention, max 50k rows).
During development without SMTP, set `HACKER_ADMIN_DEV_PASSCODE` in `.env` (ignored in production) and watch the server log for issued codes.

---

## 8. Documentation Directory

- [Architecture & Domain Model](docs/ARCHITECTURE.md)
- [REST API v1 Specification](docs/API.md)
- [Android Integration Guide](docs/ANDROID-INTEGRATION.md)
- [Authentication & RBAC](docs/AUTHENTICATION.md)
- [Database Schema & Migrations](docs/DATABASE.md)
- [Administration Console Manual](docs/ADMIN.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
