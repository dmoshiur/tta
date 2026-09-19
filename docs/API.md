# ThinkTank Academia — REST API v1 Specification

Base URL: `https://YOUR_SERVICE.onrender.com/api/v1` (or relative `/api/v1` for the web client).

Responses follow a uniform envelope:
```json
{
  "success": true,
  "data": { ... }
}
```

Errors follow a uniform envelope:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": { ... }
  }
}
```

Protected endpoints require the standard header:
`Authorization: Bearer <jwt-token>`

---

## 1. Authentication & Identity

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | `{ name, email, password }` | Registers a new learner account (201). Returns `{ token, user }`. |
| `POST` | `/auth/login` | No | `{ email, password }` | Authenticates user credentials. Returns `{ token, user }`. |
| `POST` | `/auth/logout` | User | None | Invalidates user session / audit log. |
| `GET` | `/auth/session` | User | None | Returns `{ user, permissions }` for bootstrap or cold start. |
| `POST` | `/auth/forgot-password` | No | `{ email }` | Dispatches password reset link via configured SMTP. Non-enumerating. |
| `GET` | `/auth/reset-password/:token`| No | None | Validates reset token and returns associated email. |
| `POST` | `/auth/reset-password` | No | `{ token, password }` | Updates account password using verified reset token. |
| `GET` | `/auth/roles` | No | None | Lists available platform roles and permission levels. |

---

## 2. User Profile & Preferences

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/users/me` | User | None | Returns current profile, preferences, role, and joined date. |
| `PATCH`| `/users/me` | User | `{ name?, headline?, bio?, avatar_url?, preferences? }` | Updates profile fields and notification preferences. |
| `PATCH`| `/users/me/password` | User | `{ currentPassword, newPassword }` | Updates account password with verification. |
| `POST` | `/users/me/avatar` | User | multipart `file` (JPG/PNG/WebP ≤ 5MB) | Uploads avatar to storage driver (S3 or local). |
| `DELETE`| `/users/me/avatar` | User | None | Removes user profile picture. |
| `GET` | `/users/me/devices` | User | None | Lists registered push notification device tokens. |
| `POST` | `/users/me/devices` | User | `{ token, platform: 'android' \| 'ios' \| 'web' }` | Registers device token for push delivery. |
| `DELETE`| `/users/me/devices/:token`| User | None | Deregisters a device token. |
| `DELETE`| `/users/me` | User | `{ password }` | Permanently deletes account and associated progress. |

---

## 3. Platform Discovery & Metadata

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/meta` | No | None | Platform capabilities, supported sections, content types, and storage driver. |
| `GET` | `/home` | No | `?refresh=1` | High-performance aggregated homepage payload (hero, stats, courses, books, quizzes). |
| `GET` | `/sections` | No | None | Seven ThinkTank pillars with descriptions, paths, and live counts. |
| `GET` | `/categories` | No | `?section=` | Category taxonomy with course counts. |
| `GET` | `/search` | No | `?q=&type=&page=&limit=` | Unified full-text search across courses, lessons, articles, books, quizzes, and MCQs. |
| `POST` | `/contact` | No | `{ name, email, subject, message }` | Contact form submission with admin notification. Rate limited. |
| `POST` | `/newsletter` | No | `{ email }` | Subscribes an email to the weekly newsletter. |
| `POST` | `/analytics` | No | `{ event, path, label? }` | First-party privacy-respecting pageview & interaction telemetry. |
| `GET` | `/settings/public` | No | None | Public configuration (homepage, navigation, footer, announcement banner). |

---

## 4. Courses & Learning Management (LMS)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/courses` | No | Lists published courses with `?q=`, `?section=`, `?category=`, `?difficulty=`, `?sort=`, `?page=`. |
| `GET` | `/courses/:slug` | Optional | Course curriculum, syllabus modules, published lessons, quizzes, enrollment status, and progress. |
| `POST` | `/courses/:id/enroll` | User | Enrolls learner in the course (idempotent). |
| `DELETE`| `/courses/:id/enroll` | User | Drops enrollment and clears progress. |
| `GET` | `/lessons/:id` | Optional | Lesson content, video URL, downloadable notes, resources, and next/prev links. |
| `POST` | `/lessons/:id/complete` | User | Marks lesson complete with `{ secondsSpent? }`, records course completion if finished. |
| `DELETE`| `/lessons/:id/complete`| User | Clears completion status. |
| `GET` | `/assignments` | Optional | Lists assignments for a course with user submission state. |
| `POST` | `/assignments/:id/submit` | User | Submits assignment `{ body, attachmentUrl? }`. |
| `GET` | `/dashboard` | User | Learner hub: real stats, enrolled courses, continue learning links, quiz attempts, recent views. |

---

## 5. Quizzes, MCQs & Model Tests

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/quizzes` | No | Lists published assessments with `?kind=QUIZ|MCQ|MODEL_TEST`, `?category=`, `?q=`. |
| `GET` | `/quizzes/:slug` | Optional | Quiz details, marks, duration, negative marking, attempt limits, and user history. |
| `POST` | `/quizzes/:slug/start` | User | Initiates examination attempt or resumes an active one. Returns randomized question set without correct answers. |
| `POST` | `/attempts/:id/answers`| User | Autosaves answers `{ answers: { [questionId]: optionIndex } }` during exam. |
| `POST` | `/attempts/:id/submit` | User | Final submission. Evaluates answers, applies negative marking, returns score, percentage, and explanations. |
| `POST` | `/quizzes/:slug/submit`| User | Alias to submit active attempt for a given quiz slug. |
| `GET` | `/attempts` | User | Lists learner's submitted attempt history with scores and dates. |
| `GET` | `/attempts/:id` | User | Detailed review of an attempt: prompt, user answer, correct answer, awarded marks, and explanation. |

---

## 6. Editorial Content: Articles, Knowledge, World, Humanity, Society & Books

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/content` | No | Lists published content with `?type=ARTICLE|KNOWLEDGE|WORLD|HUMANITY|SOCIETY`, `?stance=FACT|ANALYSIS|OPINION`, `?q=`. |
| `GET` | `/content/:slug` | Optional | Article detail: body, author, reading time, citations/sources, structured dossier (World Affairs), related items. |
| `GET` | `/books` | No | Lists book summaries with `?q=`, `?category=`, `?sort=newest|rating|title`. |
| `GET` | `/books/:slug` | Optional | Book summary, key ideas, actionable lessons, author context, practical applications, review, and recommendations. |
| `GET` | `/tags` | No | Returns tag clouds with usage counts. |

---

## 7. Bookmarks & In-App Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/bookmarks` | User | Lists saved items with `?type=COURSE|ARTICLE|BOOK|QUIZ|LESSON`. |
| `POST` | `/bookmarks` | User | Saves `{ item_type, item_id, note? }`. Validates target existence. |
| `DELETE`| `/bookmarks/:type/:id` | User | Removes bookmark. |
| `GET` | `/notifications` | User | Lists user & broadcast notifications with unread count. |
| `PATCH` | `/notifications/:id/read` | User | Marks notification as read. |
| `POST` | `/notifications/read-all`| User | Marks all notifications as read. |
| `DELETE`| `/notifications/:id` | User | Dismisses / deletes notification. |

---

## 8. Administration APIs (`/api/v1/admin/*`)

All admin routes require an administrative role (`SUPER_ADMIN`, `CONTENT_ADMIN`, `MODERATOR`, `ANALYST`) and enforce granular permissions.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/overview` | Admin role | Platform operational statistics (real database counts for users, courses, attempts, etc.). |
| `GET` | `/admin/resources` | Admin role | Dynamic schema metadata for all administrable tables. |
| `GET` | `/admin/options/:resource` | Admin role | Foreign-key option lookups (courses, modules, categories, users, roles). |
| `GET` | `/admin/r/:resource` | read | Paginated list with search and filter parameters. |
| `GET` | `/admin/r/:resource/:id` | read | Detailed record view. |
| `POST` | `/admin/r/:resource` | write | Creates new record with validation and audit trail. |
| `PATCH` | `/admin/r/:resource/:id` | write | Updates record fields. |
| `DELETE`| `/admin/r/:resource/:id` | delete | Permanently removes record. |
| `POST` | `/admin/r/:resource/:id/publish` | write | Toggles status between `DRAFT` and `PUBLISHED`. |
| `GET` | `/admin/users` | `users:read` | Directory of users with search and pagination. |
| `POST` | `/admin/users` | `users:write` | Creates new user with role assignment. |
| `PATCH` | `/admin/users/:id` | `users:write` | Updates role, status (active/suspended), or credentials. |
| `DELETE`| `/admin/users/:id` | `users:delete`| Permanently deletes user account. |
| `GET` | `/admin/roles` | `roles:read` | Matrix of roles and their assigned permissions. |
| `PATCH` | `/admin/roles/:id/permissions` | `roles:write` | Updates granular permissions for a role. |
| `GET` | `/admin/settings` | `settings:write` | Current site configuration (homepage hero, announcement banner, etc.). |
| `PUT` | `/admin/settings/:key` | `settings:write` | Updates configuration setting JSON. |
| `POST` | `/admin/media/upload` | `media:write` | Multipart file upload to media repository. |
| `POST` | `/admin/broadcast` | `notifications:send` | Sends in-app announcement to all learners. |
| `GET` | `/admin/analytics` | `analytics:read` | Aggregated telemetry: daily events, top courses, top articles, top pages. |
| `GET` | `/admin/activity` | Admin role | Paginated audit trail of administrative actions. |
| `POST` | `/admin/publish-scheduled` | write | Triggers immediate publishing of scheduled courses and articles. |
