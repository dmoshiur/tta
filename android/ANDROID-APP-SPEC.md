# Native Android application specification

The canonical contract is [`docs/API.md`](../docs/API.md) and mobile guidance is [`docs/ANDROID-INTEGRATION.md`](../docs/ANDROID-INTEGRATION.md).

Build one Android app with feature modules for Auth, Home, Courses, Lesson, Quiz, Explore (articles/books/knowledge/world/humanity/society), Search, Bookmarks, Notifications, Profile, and My Learning. Use the production base URL `https://thinktank-academia.onrender.com/api/v1/` from BuildConfig (`GET` on it returns the API discovery document; `GET health` is the liveness ping); separate debug/release flavors. Models wrap every success in `Envelope<T>` and parse the common error envelope.

Authentication: register/login, encrypt the JWT at rest, attach Bearer auth, clear on logout/401. User: `/users/me` read/update/password/avatar. Learning: list/detail/enroll, render module lessons, persist completion, show `/dashboard` progress. Quiz: fetch after auth, keep a monotonic local timer when duration exists, submit once, render returned review. Content: request types and show source links in a browser. Books use `type=BOOK`. Bookmark, notification and search paths are documented in the API table.

Accessibility requirements: scalable text, 48dp targets, screen-reader labels, high contrast, RTL-safe layouts, and English/Bangla string resources. Never embed database, admin password, JWT secret, or provider credentials in the APK.
