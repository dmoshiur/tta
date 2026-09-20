# Architecture

The Vite React SPA and Express API share one Node deployment. Browser clients use `VITE_API_URL` (normally relative `/api/v1`). Android and other clients use the same versioned REST API. Express applies security headers, CORS, request limits, validation, authorization, and consistent errors before database access through parameterized queries.

The database is **Turso (libsql/SQLite)** in production (`@libsql/client` over HTTPS with `DATABASE_URL=libsql://…`). Local development without `DATABASE_URL` uses a file-backed SQLite database in `./data`; tests use in-memory SQLite. A thin compatibility layer rewrites the small set of PostgreSQL-isms kept in the query catalogue (`$N` parameters, `NOW()`, `ILIKE`, `::int`, `CONCAT()`) into native SQLite syntax, so the same statements run on all three backends.

An emergency operations console lives at `/hackeradmin`: a standalone page with an hourly rotating, e-mailed passcode, a site on/off kill switch, live traffic/visitor monitoring, and admin & super-admin oversight. It is served directly by the API (no React build) and stays reachable while the site is switched off.

The **Super Admin console** at `/admin/*` is a separate application surface inside the same SPA: every admin route renders `frontend/src/components/AdminLayout.tsx` (collapsible navy sidebar, admin top bar with search / notifications / quick actions / profile, "Back to User Platform" exit), while the public header, footer and bottom navigation are hidden. Its system APIs (health, API/error logs, e-mail, security, audit, backups) live in `backend/src/routes/admin-system.routes.ts` and inherit the admin-only guard. Normal users are redirected away from `/admin/*` both client-side (layout guard) and server-side (403 on `/api/v1/admin/*`).

Production serves `dist/`; private routes (`/admin`, `/hackeradmin`) are omitted from the sitemap and robots-allowed.

Core domains: identity/RBAC, courses/modules/lessons/enrollment/progress, editorial content, quizzes/questions/attempts, bookmarks, notifications, settings, contacts, first-party analytics, and request-level traffic logging. UUID identifiers and versioned endpoints permit future clients and schema evolution.
