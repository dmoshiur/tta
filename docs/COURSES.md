# Courses

A course has metadata, category, instructor, difficulty, thumbnail URL, publication state and featured flag. Ordered modules contain ordered text/video lessons. Public users see only published courses and lessons. Authenticated users enroll idempotently and mark lessons complete; `/dashboard` derives progress from stored lesson completion rather than fabricated totals. Quizzes may attach to courses. Use HTTPS media URLs from an external provider for production thumbnails and resources.
