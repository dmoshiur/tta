# Environment

See `.env.example`. Required in production: `DATABASE_URL`, unpredictable `JWT_SECRET`, `PUBLIC_URL`, and `FRONTEND_URL`. `ADMIN_EMAIL`/`ADMIN_PASSWORD` are optional initial-seed inputs. `VITE_API_URL` defaults to `/api/v1`. `MEDIA_BASE_URL` records the chosen external media origin; content APIs store provider-returned HTTPS URLs. Never commit real secrets.
