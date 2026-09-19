# ThinkTank Academia

**Learn • Think • Understand • Unite**

A mobile-first multidisciplinary learning and knowledge platform. This repository contains the React web client, Express REST API, PostgreSQL schema, role-based administration, course/progress engine, quizzes, editorial CMS, search, bookmarks, notifications, analytics, PWA assets, and Render blueprint.

## Run locally

Requires Node 20+. `npm install`, copy `.env.example` to `.env`, then `npm run dev`. Without `DATABASE_URL`, a disposable in-memory PostgreSQL-compatible database is used. Set PostgreSQL for persistent data. Web: `http://localhost:5173`; API: `http://localhost:3000/api/v1`; health: `/api/health`.

## Production

Create the Render Blueprint from `render.yaml`, provide `PUBLIC_URL`, `FRONTEND_URL`, `ADMIN_EMAIL`, and a strong initial `ADMIN_PASSWORD`. Render supplies PostgreSQL and a generated JWT secret. The first boot creates the initial super administrator only if that email does not exist; it never logs or overwrites the password. See [deployment](docs/DEPLOYMENT.md).

## Commands

- `npm run dev` — frontend and API development
- `npm run build` — production frontend
- `npm start` — production server
- `npm test` — API tests
- `npm run typecheck` — static checking

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Android integration](docs/ANDROID-INTEGRATION.md) · [Authentication](docs/AUTHENTICATION.md) · [Database](docs/DATABASE.md) · [Admin](docs/ADMIN.md)
