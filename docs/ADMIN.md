# Administration

The responsive overview at `/admin` reports only database counts. Editorial tools consume `/api/v1/admin/*`. Permissions currently enforced are `users:read`, `users:write`, `courses:write`, `content:write`, `quizzes:write`, `analytics:read`, and `settings:write`; Super Admin has all. Course APIs create/update/delete courses and add modules/lessons. Content and quiz APIs create publishable records. Settings manages JSON homepage, navigation, footer, and announcement configuration. Role updates are restricted to authorized administrators.
