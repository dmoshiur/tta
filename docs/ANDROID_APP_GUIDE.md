# ThinkTank Academia — Android App Build Guide

This document contains **everything** needed to build the official ThinkTank Academia Android app so it matches the web platform 1:1 — brand assets, URLs, the full API catalog with request/response shapes, and design specs.

---

## 1. Branding (use the official logo — NO changes)

The official artwork ships in this repo and is public:

| Asset | URL path | Notes |
|---|---|---|
| **Official logo (full lock-up: emblem + THINKTANK + ACADEMIA + tagline)** | `/brand/logo.png` | 1408×768, white background. **Use exactly as-is.** Never recolor, crop, stretch, or redraw it. |
| Custom SVG icon set | `icons.svg` | Stroke icons used by the website (home, book, quiz, search, user, bell, bookmark, clock, arrow, chevron, logo-mark). |

**Rules**

- In-app image URL: `{BASE_URL}/brand/logo.png`.
- The PNG already contains the wordmark and tagline — **never place app-name text beside it.**
- On light screens: render directly on the screen background.
- On dark surfaces: put the logo on its native white background inside a small white chip (8 dp corner radius, ~5 dp padding, thin gold ring `rgba(228,201,126,0.35)`). Do **not** tint the artwork.
- Splash screen, login header, and drawer header should all use this one file.
- Suggested display heights: splash 120 dp, login/header 56–64 dp, splash padding ≥ 32 dp on all sides.

## 2. Backend URL

The Android app talks to the **same backend** that powers the website (Express + Turso/SQLite, TypeScript).

| Environment | Base URL | Use for |
|---|---|---|
| **Production** | `https://thinktank-academia.onrender.com/api/v1` (the value of the deployed service's `PUBLIC_URL` + `/api/v1`) | Play-store / release builds |
| Emulator (local dev) | `http://10.0.2.2:3000/api/v1` | `10.0.2.2` is the emulator alias for your PC's `localhost:3000` |
| Physical device (local dev) | `http://<your-PC-LAN-IP>:3000/api/v1` | e.g. `http://192.168.0.10:3000/api/v1` |

> **Backend URL for the app:** today there is one backend service. In production set `API_BASE_URL = {PUBLIC_URL}/api/v1`. All endpoints below are relative to that base. Static brand assets are served from the same host *without* the `/api/v1` prefix (e.g. `{PUBLIC_URL}/brand/logo.png`).
>
> If the app must call plain HTTP during development, enable cleartext only for debug builds (`android:usesCleartextTraffic="true"` in a debug manifest). Release builds must use HTTPS.

Health check: `GET {BASE_URL}/health` → `{ "ok": true, "service": "thinktank-academia", "version": "v1", "env": "production" }` (a plain object — the only response that is **not** wrapped in the `{ success, data }` envelope).

API root: `GET {BASE_URL}` (i.e. `https://thinktank-academia.onrender.com/api/v1/`) → `{ "success": true, "data": { "version": "v1", "status": "ok", "baseUrl": …, "auth": …, "groups": [ …every endpoint with method/path/auth… ] } }`. Open it in a browser to confirm the backend is live and see the complete endpoint catalogue; unknown paths return the `NOT_FOUND` error envelope with a `details.hint`.

### Authentication model (JWT)

- `POST /auth/register` and `POST /auth/login` return `{ success, data: { token, user } }`.
- Store `token` (Android `EncryptedSharedPreferences` / Keystore). Send on every authenticated request:
  `Authorization: Bearer <token>`
- Token lifetime: `JWT_EXPIRES_IN` (default **7 days**). On `401 UNAUTHENTICATED` → clear token → show login.
- Password rules: ≥ 8 chars incl. upper, lower, number, symbol (server validates; register returns `WEAK_PASSWORD` with issues).

### Response envelope (every endpoint)

```json
// success
{ "success": true, "data": { ... } }
// error
{ "success": false, "error": { "code": "EMAIL_IN_USE", "message": "Human readable message", "details"?: {} } }
```

Always read `error.message` for user-facing toasts; switch on `error.code` for logic.
Rate limiting: auth endpoints allow 20 requests / 15 min per IP (`429 RATE_LIMITED`).

## 3. Full API endpoint catalog

Base: `{API_BASE_URL}`. ✅ = public, 🔒 = requires `Authorization: Bearer`.

### Auth (`/auth`)
| Method & path | Auth | Body → Data |
|---|---|---|
| `POST /auth/register` | ✅ | `{ name, email, password }` → `{ token, user }` |
| `POST /auth/login` | ✅ | `{ email, password }` → `{ token, user }` |
| `POST /auth/logout` | 🔒 | — → `{ ok: true }` |
| `GET /auth/session` | 🔒 | → `{ user }` (validate stored token on app start) |
| `POST /auth/forgot-password` | ✅ | `{ email }` → `{ ok: true, message }` (always ok) |
| `GET /auth/reset-password/:token` | ✅ | → `{ valid, email }` |
| `POST /auth/reset-password` | ✅ | `{ token, password }` → `{ ok: true }` |
| `GET /auth/roles` | ✅ | → `[{ id, name }]` |

`user` object: `{ id, name, email, role, avatar_url, xp, level, streak_days, created_at, ... }`.

### Learning (`/`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /categories` | ✅ | 7 editorial category blocks for home/study browse |
| `GET /sections` | ✅ | Content sections / pillars |
| `GET /courses` | ✅ | `?category=&search=&level=&page=` → course catalog with pagination |
| `GET /courses/:slug` | ✅ | Course detail: description, modules → lessons, instructor, hours, quiz ids |
| `POST /courses/:id/enroll` | 🔒 | Body `{}` → enroll (idempotent) |
| `DELETE /courses/:id/enroll` | 🔒 | Un-enroll |
| `GET /lessons/:id` | 🔒 | Lesson content + progress state (read-mode screen) |
| `POST /lessons/:id/complete` | 🔒 | Mark complete → updates progress + XP |
| `DELETE /lessons/:id/complete` | 🔒 | Unmark |
| `GET /assignments` | 🔒 | Assignment list |
| `POST /assignments/:id/submit` | 🔒 | `{ answer }` → submission record |
| `GET /dashboard` | 🔒 | Learning dashboard: continue-learning, progress %, XP/level, streak, counts |

### Quizzes (`/`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /quizzes` | ✅ | `?category=&difficulty=&search=&page=` catalog |
| `GET /quizzes/:slug` | ✅ | Meta: question count, time limit, difficulty |
| `POST /quizzes/:slug/start` | 🔒 | → `{ attempt }` (`id`, `questions[]` with options, `resumed: bool`, `remainingSeconds`) — **resume-safe** |
| `POST /attempts/:id/answers` | 🔒 | `{ questionId, optionId }` → autosave one answer (draft). Call on every selection for crash recovery |
| `POST /attempts/:id/submit` | 🔒 | → `{ result }` score, correct/wrong/unanswered, review data |
| `POST /quizzes/:slug/submit` | 🔒 | One-shot submit (no start) — used by quest-style flow |
| `GET /attempts` | 🔒 | Attempt history (profile/statistics) |
| `GET /attempts/:id` | 🔒 | Full review of one attempt with correct answers |

### Content (articles & books) (`/`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /content` | ✅ | Article/content catalog `?category=&search=&page=` |
| `GET /content/:slug` | ✅ | Full article (rich body, reading time) |
| `GET /books` | ✅ | Digital library catalog |
| `GET /books/:slug` | ✅ | Book detail incl. summaries |
| `GET /tags` | ✅ | Tag list |

### Discovery, bookmarks, notifications (`/`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /search?q=` | ✅ | Global search across courses/quizzes/articles/books |
| `GET /bookmarks` | 🔒 | Saved items `{ type, item }[]` |
| `POST /bookmarks` | 🔒 | `{ type: 'COURSE'\|'QUIZ'\|'CONTENT'\|'BOOK', id }` |
| `DELETE /bookmarks/:type/:id` | 🔒 | Remove |
| `GET /notifications` | 🔒 | List with `unread` flag |
| `PATCH /notifications/:id/read` | 🔒 | Mark one read |
| `POST /notifications/read-all` | 🔒 | Mark all read |
| `DELETE /notifications/:id` | 🔒 | Delete |
| `POST /contact` | ✅ | `{ name, email, message }` |
| `POST /newsletter` | ✅ | `{ email }` |
| `POST /newsletter/unsubscribe` | ✅ | `{ email }` |
| `GET /settings/public` | ✅ | Public site settings (feature flags, contact info) |
| `GET /home` | ✅ | Aggregated home payload (sections, featured) |
| `GET /meta` | ✅ | SEO/meta |
| `POST /analytics` | ✅ | Lightweight event ping `{ event, path }` (best-effort) |

### User profile (`/users`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /users/me` | 🔒 | Current user + stats |
| `PATCH /users/me` | 🔒 | `{ name?, bio?, ... }` update |
| `PATCH /users/me/password` | 🔒 | `{ currentPassword, newPassword }` |
| `POST /users/me/avatar` | 🔒 | `multipart/form-data` field `file` → `{ avatar_url }` |
| `DELETE /users/me/avatar` | 🔒 | Remove |
| `GET /users/me/devices` | 🔒 | Session/device list |
| `DELETE /users/me/devices/:token` | 🔒 | Sign out a device |
| `DELETE /users/me` | 🔒 | Delete account |

### Media
`GET /api/v1/media/:id` serves uploaded files (progressive). Use `GET /api/v1/media/:id/meta` for metadata. Build URLs as `{MEDIA_HOST}/api/v1/media/{id}`.

### Error codes to handle
`UNAUTHENTICATED`, `UNAUTHORIZED`, `NOT_FOUND`, `FORBIDDEN`, `EMAIL_IN_USE`, `WEAK_PASSWORD`, `INVALID_CREDENTIALS`, `RATE_LIMITED`, `VALIDATION_FAILED` (`details` map per field), `CONFIGURATION_ERROR`.

## 4. Screens → data mapping

| App screen | Calls |
|---|---|
| Splash | none (logo only) → `GET /auth/session` if token exists |
| Onboarding/Login/Register | `/auth/login`, `/auth/register`, `/auth/forgot-password` |
| Home | `GET /home`, `GET /categories`, `GET /dashboard` 🔒 (continue-learning strip) |
| Courses (browse) | `GET /courses`, `GET /categories` (filter chips) |
| Course detail | `GET /courses/:slug`, `POST /courses/:id/enroll` |
| Lesson reader | `GET /lessons/:id`, `POST /lessons/:id/complete` |
| Quizzes | `GET /quizzes`, `GET /quizzes/:slug` |
| Quiz runner | `POST /quizzes/:slug/start` → autosave via `POST /attempts/:id/answers` → `POST /attempts/:id/submit` |
| Search | `GET /search?q=` (debounce 300 ms) |
| Library (articles/books) | `GET /content`, `GET /content/:slug`, `GET /books`, `GET /books/:slug` |
| Dashboard | `GET /dashboard`, `GET /attempts` (history), `GET /bookmarks` |
| Profile/settings | `GET/PATCH /users/me`, `POST /users/me/avatar`, `PATCH /users/me/password`, `GET/DELETE /users/me/devices` |
| Notifications | `GET /notifications`, `PATCH …/read`, `POST …/read-all` |

Every list screen must implement: pull-to-refresh → re-fetch; skeleton while loading (never a white flash); empty state with illustration + CTA; offline/error state with a friendly message + "Try again" button. Counters and progress displayed in-app must come from real API data — never fake numbers.

## 5. Bottom navigation ("down nav") — required options

Mirror the mobile web bottom bar exactly. **5 tabs, 56 dp height, icons 24 dp, 10–11 sp labels, 48 dp min touch targets:**

1. **Home** — home icon → `/` (home screen)
2. **Courses** — open-book icon → `/courses`
3. **Quizzes** — puzzle/trophy icon → `/quizzes`
4. **Search** — magnifier icon → `/search`
5. **Dashboard** — dashboard/user icon → `/dashboard` when logged in; **label switches to "Sign In"** and routes to login when logged out

Behavior rules (same as web): active tab = gold dot above + navy label; inactive = muted; bar hides on lesson reader & quiz runner (full focus); badges on Dashboard when notifications `unread > 0`; haptic feedback on tap; deep-link-safe back stack (each tab keeps its own back stack, Home is root).

## 6. Design system (match the website 1:1)

### Color tokens
| Token web var | Hex | Android usage |
|---|---|---|
| `--navy` | `#0A2540` | Primary, headings, buttons, emblem |
| `--navy-2` | `#12305A` | Primary variant / pressed |
| `--gold` | `#B08D2E` / `#E4C97E` | Accent (sparingly): active states, dividers, CTAs secondary |
| `--paper` | `#FAF7F2` | Background (warm paper white — not `#FFFFFF`) |
| `--surface` | `#FFFFFF` | Cards |
| `--ink` | `#20262E` | Body text |
| `--ink-soft` | `#5A6472` | Secondary text |
| `--line` | `#E7E2D8` | Hairlines/dividers |
| success/warn/error | `#2E7D5B` / `#B54708` / `#B42318` | States |
| dark surface | `#0D1B2A` | Dark-mode surface / footer |

No random per-screen colors — consume these tokens only. Restrained gold; no gradient spam, no glassmorphism, no excessive rounded rects (cards: 12–16 dp radius; buttons 10–12 dp; chips 999).

### Typography
| Role | Web font | Android equivalent |
|---|---|---|
| Display/serif (headings, logo-adjacent titles) | Fraunces | **Playfair Display** (or ship Fraunces.ttf) |
| UI/body sans | Inter | **Inter** (Google Fonts downloadable font) |

Native Bangladeshi (বাংলা) fallback: **Noto Serif Bengali** + **Noto Sans Bengali** — the app is fully bilingual (en + bn); bundle a strings file per locale identical to the web dictionary keys (720 keys — never hardcode English).

### Motion
Strategic, GPU-friendly: 150–250 ms `FastOutSlowIn` reveals, staggered item entrances (~40 ms), parallax on hero only, masked line-reveal on the home headline. Respect reduced-motion (system "Remove animations" → disable).

### Accessibility & quality bars (non-negotiable)
- 48 dp touch targets, visible focus rings, content descriptions on all images/icons.
- Full en ↔ bn localization of **every** string, announced dynamically.
- No horizontal scroll on 320–430 dp widths; images `center-crop` w/ fixed aspect (16:9 hero, 3:2 cards, 1:1 avatars); lazy-load + placeholder skeletons tinted `--paper` (no white flash).
- No functionality gaps: auth, enrollment, lesson progress, quiz autosave/resume/submit, bookmarks, notifications, search, device sessions must all work against the live API.
- Never expose secrets: no JWT secret, SMTP creds, DB URLs, or admin endpoints in the app or UI. Admin console stays web-only.
- Real data only: stats/XP/streaks render from API values; hide counters when value unavailable.

## 7. Suggested stack (Kotlin-first)

- Kotlin + Jetpack Compose (Material 3 with custom tokens above), Navigation-Compose, Hilt, Retrofit/OkHttp (+ `Authorization` interceptor & 401-refresh → login), Room for offline cache of catalogs/bookmarks, DataStore for token + locale + notification prefs, Coil for images, WorkManager for retry queues (quiz autosave, analytics pings).
- Min SDK 26, target/compile latest stable, single-activity architecture.

## 8. Definition of done (Android)

1. Splash → session check → Home (or Login) with smooth reveal, official logo untouched.
2. Register/login/logout/forgot/reset fully working against production URL.
3. All five bottom-nav destinations functional; Dashboard requires auth; sign-in label state correct.
4. Course browse → detail → enroll → lesson read → complete → dashboard progress updates.
5. Quiz: start/resume, autosave per answer (kill the app mid-quiz → resume), submit → result + review.
6. Search, bookmarks sync, notifications list/mark-read, profile edit + avatar upload, device management.
7. en/bn switch translates 100% of UI (all 720 keys).
8. No fake data anywhere; offline shows friendly cached/error states; rate-limit message handled gracefully.
