# Administration

## Super Admin console (`/admin/*`)

The Super Admin experience is a **completely separate application surface** inside ThinkTank Academia. It never shows the public website or learner navigation:

| Surface | Layout | Navigation |
| --- | --- | --- |
| Public website (`/`, `/courses`, `/books`, …) | Public site shell | Site header / footer / mobile bottom nav |
| Learner dashboard (`/dashboard`, `/my-learning`, …) | User shell | Same site chrome, authenticated views |
| **Super Admin (`/admin/*`)** | **`AdminLayout`** | **Dedicated admin sidebar + admin top bar** |

Every `/admin/*` route renders inside `frontend/src/components/AdminLayout.tsx`:

- **Guard** — unauthenticated visitors go to `/login`; non-admin roles are redirected to `/dashboard`. The backend independently enforces `adminOnly()` on every `/api/v1/admin/*` endpoint.
- **Collapsible fixed sidebar** — collapses to an icon rail (preference persisted in `localStorage`). On mobile it becomes a drawer. Contains the console sections:
  - *Overview* — Dashboard (Analytics)
  - *People & Learning* — Users (Roles & Permissions), Learning Management (Modules, Lessons, Assignments), Courses, Quizzes & Tests (Question Bank, Attempt History), Books (Articles & Sections), Categories
  - *Communications* — Email Center (Subscribers, Contact Messages), SMTP Logs
  - *System & Operations* — Audit Logs, Security, System Health, API & Error Logs, Backups
  - *Configuration* — Settings (Media Library)
- **Admin top bar** — quick-jump admin search, notifications bell (unread badge, mark-all-read), quick actions menu, and the admin profile menu.
- **Back to User Platform** — prominent exit button in the sidebar footer and in the profile menu; returns to the learner dashboard at `/dashboard`.

### Console pages & APIs

| Page | Route | API |
| --- | --- | --- |
| Dashboard | `/admin/dashboard` | `GET /admin/overview` |
| Users | `/admin/users` | `GET/POST /admin/users`, `PATCH/DELETE /admin/users/:id` |
| Roles & permissions | `/admin/roles` | `GET /admin/roles`, `PATCH /admin/roles/:id/permissions` |
| Learning Management | `/admin/learning` | `GET /admin/overview` |
| Courses / Books / Categories / generic CRUD | `/admin/courses`, `/admin/books`, `/admin/categories`, `/admin/r/:resource[/id]` | `/admin/r/:resource…` (dynamic registry) |
| Quizzes & Tests | `/admin/quizzes-tests` | `GET /admin/overview` |
| Email Center | `/admin/email` | `GET /admin/email/overview`, `POST /admin/email/send` |
| SMTP Logs | `/admin/email/smtp-logs` | `GET /admin/email/logs` |
| Audit Logs | `/admin/audit-logs` | `GET /admin/audit-logs` (search + filters) |
| Security | `/admin/security` | `GET /admin/security/overview` |
| System Health | `/admin/system/health` | `GET /admin/system/health` |
| API & Error Logs | `/admin/system/api-logs` | `GET /admin/system/api-logs` |
| Backups | `/admin/backups` | `GET/POST /admin/backups`, `GET /admin/backups/:id/download`, `DELETE /admin/backups/:id` |
| Settings | `/admin/settings` | `GET /admin/settings`, `PUT /admin/settings/:key` |
| Media Library | `/admin/media` | `POST /admin/media/upload` + media resource |
| Analytics | `/admin/analytics` | `GET /admin/analytics` |

These live in `backend/src/routes/admin-system.routes.ts` (system, e-mail, security, audit, backups) mounted inside the admin router, so every endpoint inherits the administrator guard.

### Notable behaviours

- **SMTP logging** — every outgoing e-mail attempt (transactional, admin-sent, hacker-admin passcodes) is recorded in the `smtp_log` table with `SENT` / `FAILED` / `SKIPPED` status; the Email Center and SMTP Logs pages read this trail.
- **Backups** — `POST /admin/backups` writes a full JSON snapshot of every table to `data/backups/` with password hashes, reset tokens and device tokens redacted; metadata is kept in the `backups` table. Downloads stream through the authenticated API client.
- **Failed logins** — failed password attempts are recorded in the activity log (`LOGIN_FAILED` with source IP) and surfaced on the Security page.
- **Retention** — the request log keeps 7 days / 50,000 rows (pruned by the server timer).

Permissions enforced include `users:read`, `users:write`, `courses:write`, `content:write`, `quizzes:write`, `notifications:send`, `analytics:read` and `settings:write`; Super Admin holds all of them. Course APIs create/update/delete courses and add modules/lessons. Content and quiz APIs create publishable records. Settings manages JSON homepage, navigation, footer, and announcement configuration. Role updates are restricted to authorized administrators.
