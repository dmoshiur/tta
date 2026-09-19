# Authentication

Register/login returns a signed bearer JWT valid for seven days. Send `Authorization: Bearer <token>`. Passwords use bcrypt cost 12. Login and contact routes are rate limited. Protected endpoints verify signatures; admin endpoints additionally enforce role and permission. Roles: `SUPER_ADMIN`, `CONTENT_ADMIN`, `MODERATOR`, `ANALYST`, `USER`. Super Admin bypasses granular permission checks. Logout is client-side token deletion; changing a password updates its bcrypt hash.

The forgot-password endpoint intentionally gives a non-enumerating response. Transactional reset email/token delivery is pending SMTP-provider configuration and is not represented as complete functionality in the UI.
