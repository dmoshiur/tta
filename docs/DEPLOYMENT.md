# Render deployment

Use `render.yaml` to create the web service and PostgreSQL database. Set both public URL values to the final HTTPS service URL. Build is `npm ci && npm run build`; start is `npm start`; health is `/api/health`. The server binds `0.0.0.0:$PORT`. Production has no generated localhost URL. Configure an external image provider (Cloudinary/S3-compatible) and submit its HTTPS asset URLs through admin APIs; ephemeral local uploads are intended only for development avatars.

After deploy: check health, create/login initial admin, rotate or remove `ADMIN_PASSWORD`, create categories/content, verify sitemap/robots, enrollment, quiz submission, and mobile layouts.
