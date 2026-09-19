# Database

The database is **SQLite (Turso/libsql)**. Tables are created idempotently at API startup: `roles`, `permissions`, `role_permissions`, `users`, `password_resets`, `user_devices`, `categories`, `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress`, `assignments`, `assignment_submissions`, `quizzes`, `questions`, `quiz_questions`, `attempts`, `content`, `books`, `bookmarks`, `notifications`, `media`, `settings`, `analytics_events`, `contacts`, `subscribers`, `activity_log`, `recently_viewed`, plus the operations tables `hacker_admin_state` (rotating passcode window) and `request_log` (traffic monitoring, 7-day retention).

Conventions:

- **Types:** `TEXT` for identifiers, timestamps (ISO-8601 UTC strings) and JSON payloads (quiz answers, sources, SEO, tags as JSON arrays); `INTEGER` for counters and booleans; `REAL` for marks/scores.
- **Foreign keys** cascade for owned learning records. Unique email/slug and status/user indexes protect integrity and common queries.
- **Dates:** every `*_at` column is an ISO-8601 UTC string, so lexicographic order equals chronological order; the compatibility layer maps the legacy `NOW()` to `strftime('%Y-%m-%dT%H:%M:%fZ','now')`.
- **Backends:** `libsql://` (Turso over HTTPS) in production, `file:` (local `./data/thinktank.sqlite`) in development, `file::memory:` in tests. All application queries are parameterized.

Back up production with Turso's scheduled snapshots or `turso db shell | .dump`. Apply additive migrations before destructive changes; startup DDL is safe and idempotent but is not a replacement for reviewed production migrations as the schema evolves.
