# Architecture

The Vite React SPA and Express API share one Node deployment. Browser clients use `VITE_API_URL` (normally relative `/api/v1`). Android and other clients use the same versioned REST API. Express applies security headers, CORS, request limits, validation, authorization, and consistent errors before PostgreSQL access through parameterized queries. In-memory `pg-mem` is development-only. Production serves `dist/`; private routes are omitted from sitemap.

Core domains: identity/RBAC, courses/modules/lessons/enrollment/progress, editorial content, quizzes/questions/attempts, bookmarks, notifications, settings, contacts, and first-party analytics. UUID identifiers and versioned endpoints permit future clients and schema evolution.
