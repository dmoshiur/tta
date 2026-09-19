# REST API v1

Base: `https://YOUR_SERVICE.onrender.com/api/v1`. JSON responses are `{ "success": true, "data": ... }`; errors are `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`. Protected calls send `Authorization: Bearer JWT`. Lists accept documented query values and are capped at 50 where paginated.

## Identity

| Method | Endpoint | Auth | Body / result |
|---|---|---|---|
| POST | `/auth/register` | No | `{name,email,password}` → `{token,user}` (201) |
| POST | `/auth/login` | No | `{email,password}` → `{token,user}` |
| POST | `/auth/logout` | User | `{loggedOut:true}`; client deletes token |
| POST | `/auth/forgot-password` | No | `{email}`; non-enumerating acknowledgement |
| GET | `/users/me` | User | Current profile |
| PATCH | `/users/me` | User | `{name}` |
| PATCH | `/users/me/password` | User | `{currentPassword,newPassword}` |
| POST | `/users/me/avatar` | User | multipart `file`, JPG/PNG/WebP ≤3 MB; development storage |

```http
POST /api/v1/auth/login
Content-Type: application/json

{"email":"reader@example.com","password":"correct-horse-123"}
```
```json
{"success":true,"data":{"token":"eyJ...","user":{"id":"uuid","email":"reader@example.com","name":"Reader","role":"USER","permissions":[]}}}
```

## Learning and content

| Method | Endpoint | Auth | Request / response |
|---|---|---|---|
| GET | `/categories` | No | Category array |
| GET | `/courses?q=&page=&limit=` | No | Published course page |
| GET | `/courses/:slug` | No | Course with published modules/lessons |
| POST | `/courses/:id/enroll` | User | Idempotent enrollment |
| POST | `/lessons/:id/complete` | User | Stored completion |
| GET | `/dashboard` | User | Enrolled courses/progress and attempts |
| GET | `/content?type=ARTICLE&q=&limit=` | No | Published content; `ALL` searches all types |
| GET | `/content/:slug` | No | Published content detail and sources |
| GET | `/search?q=` | No | `{courses,content}` across public records |
| GET | `/quizzes` | No | Published quiz metadata |
| GET | `/quizzes/:id` | User | Questions without correct answers |
| POST | `/quizzes/:id/submit` | User | `{answers:{questionId:value},startedAt?}` → persisted score/review |
| GET | `/bookmarks` | User | Bookmark records |
| POST | `/bookmarks` | User | `{itemType,itemId}`; type is COURSE/LESSON/ARTICLE/BOOK/QUESTION |
| DELETE | `/bookmarks/:type/:id` | User | Remove bookmark |
| GET | `/notifications` | User | Latest 50 real notifications |
| PATCH | `/notifications/:id/read` | User | Mark own notification read |
| POST | `/contact` | No | `{name,email,subject,message}` (rate limited) |
| POST | `/analytics` | No | `{event:"PAGE_VIEW"|"COURSE_VIEW",path}` |
| GET | `/settings/public` | No | Homepage/navigation/footer/announcement JSON |

Quiz answer values must match the question's stored `correct` JSON. Example: `{"answers":{"question-uuid":"Paris"}}`. Result: `{"attemptId":"...","score":1,"total":1,"review":[{"id":"...","correct":true,"correctAnswer":"Paris","explanation":"..."}]}`.

## Administration

All require an admin role and bearer token. Non-super-admins also require the permission in parentheses.

| Method | Endpoint | Permission | Body |
|---|---|---|---|
| GET | `/admin/overview` | admin role | Database counts |
| GET | `/admin/users` | `users:read` | Latest 100 safe user records |
| PATCH | `/admin/users/:id/role` | `users:write` | `{role,permissions[]}` |
| POST | `/admin/courses` | `courses:write` | Course schema below |
| PATCH/DELETE | `/admin/courses/:id` | `courses:write` | Full course body / none |
| POST | `/admin/courses/:id/modules` | `courses:write` | `{title,position}` |
| POST | `/admin/modules/:id/lessons` | `courses:write` | `{title,content,videoUrl?,durationMinutes,position,status}` |
| POST | `/admin/content` | `content:write` | Content schema below |
| POST | `/admin/quizzes` | `quizzes:write` | `{title,courseId?,durationMinutes?,negativeMark,status}` |
| POST | `/admin/quizzes/:id/questions` | `quizzes:write` | `{prompt,type,options,correct,explanation,marks,difficulty}` |
| GET | `/admin/analytics` | `analytics:read` | Grouped real events |
| PUT | `/admin/settings/:key` | `settings:write` | Arbitrary JSON setting |

Course: `{title,slug,description,categoryId?,instructor?,difficulty:"BEGINNER"|"INTERMEDIATE"|"ADVANCED",thumbnailUrl?,status:"DRAFT"|"PUBLISHED"|"SCHEDULED",featured}`.

Content: `{type,title,slug,excerpt,body,categoryId?,coverUrl?,status,sources:[{title,url}],seo:{title?,description?}}`. `type` is ARTICLE/BOOK/KNOWLEDGE/WORLD/HUMANITY/SOCIETY.

## Status codes

`200` success, `201` created, `400` validation/bad password, `401` missing/invalid token, `403` permission denied, `404` missing or unpublished resource, `409` duplicate email/slug, `429` rate limit, `500` opaque internal error. Validation details are field-keyed; server internals and credentials are never returned.
