# Database

PostgreSQL tables are created idempotently at API startup: `users`, `categories`, `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress`, `content`, `quizzes`, `questions`, `attempts`, `bookmarks`, `notifications`, `contacts`, `settings`, and `analytics`. Foreign keys cascade for owned learning records. Unique email/slug and status/user indexes protect integrity and common queries. JSONB stores quiz answer structures, source lists, SEO metadata, and manageable site settings. All application queries are parameterized.

Back up production with Render PostgreSQL backups. Apply additive migrations before destructive changes; startup DDL is safe and idempotent but is not a replacement for reviewed production migrations as the schema evolves.
