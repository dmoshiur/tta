# Architecture

The Vite React SPA and Express API share one Node deployment. Browser clients use `VITE_API_URL` (normally relative `/api/v1`). Android and other clients use the same versioned REST API. Express applies security headers, CORS, request limits, validation, authorization, and consistent errors before database access through parameterized queries.

The database is **Turso (libsql/SQLite)** in production (`@libsql/client` over HTTPS with `DATABASE_URL=libsql://…`). Local development without `DATABASE_URL` uses a file-backed SQLite database in `./data`; tests use in-memory SQLite. A thin compatibility layer rewrites the small set of PostgreSQL-isms kept in the query catalogue (`$N` parameters, `NOW()`, `ILIKE`, `::int`, `CONCAT()`) into native SQLite syntax, so the same statements run on all three backends.

An emergency operations console lives at `/hackeradmin`: a standalone page with an hourly rotating, e-mailed passcode, a site on/off kill switch, live traffic/visitor monitoring, and admin & super-admin oversight. It is served directly by the API (no React build) and stays reachable while the site is switched off.

Production serves `dist/`; private routes (`/admin`, `/hackeradmin`) are omitted from the sitemap and robots-allowed.

Core domains: identity/RBAC, courses/modules/lessons/enrollment/progress, editorial content, quizzes/questions/attempts, bookmarks, notifications, settings, contacts, first-party analytics, and request-level traffic logging. UUID identifiers and versioned endpoints permit future clients and schema evolution.
