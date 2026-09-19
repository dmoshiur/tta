# ThinkTank Academia

> **Learn • Think • Understand • Unite**  
> *A Learning & Knowledge Platform for Education, Ideas, and Humanity.*

---

## 1. Product Overview

ThinkTank Academia is a complete, multidisciplinary learning and knowledge platform built mobile-first. It synthesizes:
- **Education & LMS:** Structured multi-module courses with rich lessons, video integration, downloadable resources, assignments, and verified progression tracking.
- **Job Preparation:** Competitive recruitment question banks, timed model tests with negative marking, previous exam analysis, and focused modules across General Knowledge, Current Affairs, English, বাংলা, Mathematics, and ICT.
- **Academic Learning:** Foundational concept explanations, guided tutorials, worked problem solving, and evidence-based study techniques.
- **Books & Ideas:** Deep summaries, key arguments, historical context, practical applications, and critical reviews.
- **General Knowledge:** Rigorous explorations in history, natural sciences, technology, economics, psychology, and philosophy.
- **World Affairs & Geopolitics:** Balanced international relations and strategic analysis strictly categorised into **Fact, Analysis, and Opinion** with citations.
- **Humanity & Social Unity:** Cultivating active empathy, unconditional human dignity, moral courage, civic dialogue, diversity, and peaceful coexistence.
- **Assessment Engine:** Timed model tests, MCQ practice sets, autosave, question index navigation, instant scoring, and explanation reviews.
- **Editorial CMS & Operations:** Full role-based access control (Super Admin, Content Admin, Moderator, Analyst), media asset repository, dynamic homepage & navigation management, and broadcast notifications.

---

## 2. Technology Architecture

- **Backend:** Node.js (v22+), Express 5, TypeScript.
- **Database:** PostgreSQL (with fallback to disposable in-memory `pg-mem` for zero-configuration local development and tests). Idempotent migration and starter content seed on boot.
- **Security:** Bcrypt salted password hashing, signed JWT Bearer authentication, role-based permission enforcement, Helmet security headers, CORS origin allowlists, and rate limiting.
- **Storage:** Pluggable storage abstraction supporting local storage for development and S3-compatible providers (Cloudflare R2, AWS S3, MinIO) for production.
- **Email & Push:** Transactional password reset emails via SMTP and push notification device token registration.
- **Frontend:** React 19, TypeScript, React Router 7, Vite 8.
- **Design System:** Deep Navy (`#071b33`), Gold (`#d4b274`), Cream (`#f7f2e8`), and Soft Blue (`#e9f0f8`) academic visual identity. Mobile-first responsive layouts tested from 320px to 1440px+.

---

## 3. Project Structure

```text
thinktank-academia/
├── backend/
│   ├── src/
│   │   ├── admin/             # Resource schema registry & publish timers
│   │   ├── db/                # PostgreSQL portable schema, pool & starter seed library
│   │   ├── lib/               # Storage (S3/local), mail, sanitization, utilities
│   │   ├── middleware/        # JWT auth, role permissions, rate limiters, error handler
│   │   ├── routes/            # Versioned API routes (auth, courses, quizzes, content, admin)
│   │   ├── security/          # Password hashing, token signing, session cache
│   │   ├── services/          # In-app notifications & audit activity logging
│   │   ├── config.ts          # Central environment configuration
│   │   └── server.ts          # Express server lifecycle & SPA static server
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, Footer, MobileBottomNav, CourseCard, QuizCard, etc.
│   │   ├── context/           # AuthContext & ToastContext
│   │   ├── pages/             # Home, Courses, Books, Quizzes, Articles, Search, Static
│   │   │   ├── user/          # Login, Register, Dashboard, My Learning, Bookmarks, Profile
│   │   │   └── admin/         # Admin Dashboard, Resource List, Editor, Users, Roles, Settings
│   │   ├── types/             # Shared TypeScript domain models
│   │   ├── api.ts             # Typed REST API client
│   │   ├── main.tsx           # Application root & client routing
│   │   └── styles.css         # Complete mobile-first stylesheet
├── public/                    # PWA manifest, service worker, brand SVG icon
├── tests/                     # API integration test suite
├── docs/                      # Architectural & API specifications
├── .env.example               # Environment variable reference
├── render.yaml                # Render Blueprint deployment definition
└── vite.config.ts             # Vite development server & proxy configuration
```

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 20+ (tested on Node 22)
- npm 10+

### Installation & Run

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
   *(Without `DATABASE_URL`, the server automatically starts using an in-memory PostgreSQL engine so you can develop immediately with zero external dependencies).*

3. Start development servers:
   ```bash
   npm run dev
   ```
   - Web application: `http://localhost:5173`
   - REST API: `http://localhost:3000/api/v1`
   - Health endpoint: `http://localhost:3000/api/health`

4. Automated administrative seeding:
   If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are provided in `.env`, the system automatically provisions the initial Super Administrator on the first startup.

---

## 5. Development & Testing Commands

| Command | Action |
|---|---|
| `npm run dev` | Runs concurrently: backend API watcher and Vite frontend development server. |
| `npm run build` | Builds production frontend assets to `dist/`. |
| `npm start` | Launches production server (serves API and compiled client). |
| `npm test` | Runs the automated API test suite. |
| `npm run typecheck`| Runs TypeScript static type checking across backend and frontend. |

---

## 6. Production Deployment on Render

This repository is configured for one-click deployment using Render Blueprints (`render.yaml`).

1. Connect this repository to your Render account.
2. Render provisions:
   - Web service (`thinktank-academia`) running Node.js.
   - Managed PostgreSQL database (`thinktank-db`).
3. Set environment variables in Render:
   - `PUBLIC_URL`: Your deployed HTTPS service URL (e.g., `https://thinktank-academia.onrender.com`).
   - `FRONTEND_URL`: Allowed CORS origin(s).
   - `ADMIN_EMAIL`: Initial admin login address.
   - `ADMIN_PASSWORD`: Strong initial administrator password.
4. Health check:
   - Health path: `/api/health` returns `200 OK`.
5. Static & SPA Serving:
   - In production, Express automatically serves `dist/` and routes all non-API paths to `index.html`.

---

## 7. Documentation Directory

- [Architecture & Domain Model](docs/ARCHITECTURE.md)
- [REST API v1 Specification](docs/API.md)
- [Android Integration Guide](docs/ANDROID-INTEGRATION.md)
- [Authentication & RBAC](docs/AUTHENTICATION.md)
- [Database Schema & Migrations](docs/DATABASE.md)
- [Administration Console Manual](docs/ADMIN.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
