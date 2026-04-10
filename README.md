# Servify

Servify is a full-stack home services marketplace where users can discover professionals, book services, track jobs, chat with professionals, and manage account activity from role-based dashboards.

## Table of Contents

- [What This Project Includes](#what-this-project-includes)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Role Model and Flows](#role-model-and-flows)
- [Frontend Routes](#frontend-routes)
- [Backend API Overview](#backend-api-overview)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Runbook: Common Commands](#runbook-common-commands)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## What This Project Includes

- User, professional, and admin authentication flows
- Service catalog and category browsing
- Booking creation, pricing quote, lifecycle updates, and timeline tracking
- Real-time style workflow support with booking tracking websocket endpoint
- In-app messaging between users and professionals
- Notifications, reviews, disputes, and admin moderation actions
- Professional profile management, including photo upload support

## Tech Stack

### Frontend

- React 19 + TypeScript
- Vite 6
- React Router
- Tailwind CSS v4
- Lucide icons
- Motion animations via `motion`

### Backend

- Express.js
- node-postgres (pg)
- PostgreSQL
- Redis
- JWT-based auth with role-based authorization
- express-rate-limit

### Dev and Infra

- Docker Compose for local dependencies and local full-stack runs
- MailHog for local SMTP testing
- Render blueprint (`render.yaml`) for free-tier deployment

## Architecture

High-level request flow:

1. Frontend calls API through `src/api/client.ts`.
2. In local dev, Vite proxies `/api/*` and `/uploads/*` to the Express backend.
3. Express serves REST endpoints under `/api/v1/*` and static files under `/uploads/*`.
4. Backend persists data in PostgreSQL and uses Redis for websocket/pub-sub related flows.

Important backend entrypoints:

- `backend/src/server.js` mounts routers, middleware, and websocket tracking
- `backend/src/config.js` defines settings from environment variables
- `backend/src/db.js` handles PostgreSQL pooling and table bootstrap

## Repository Structure

```text
.
|- src/                      # Frontend React app
|  |- api/client.ts          # Typed API wrapper used by pages/components
|  |- components/            # Shared UI + layout components
|  |- context/AuthContext.tsx
|  |- pages/                 # Route-level pages and dashboards
|  |- index.css              # Global styles + theme tokens
|  |- App.tsx                # Frontend route map
|
|- backend/
|  |- src/
|  |  |- server.js           # Express app + router mounting + websocket tracking
|  |  |- config.js           # Runtime settings
|  |  |- db.js               # PostgreSQL pool + table bootstrap
|  |  |- auth.js             # JWT auth + RBAC middleware
|  |  |- pricing.js          # Pricing and fees logic
|  |- package.json
|  |- .env.example
|
|- docker-compose.yml        # Local db/redis/mailhog + app services
|- render.yaml               # Render blueprint for free deployment
|- docs/deploy-free.md       # Step-by-step free deployment guide
```

## Role Model and Flows

Servify has three primary roles:

- `user`: browses services/professionals, creates bookings, tracks and reviews jobs
- `professional`: manages availability/profile, receives bookings, updates booking progress
- `admin`: views analytics, moderates users/professionals, manages KYC and platform controls

Frontend route protection is implemented in `src/App.tsx` with a `ProtectedRoute` component and role checks.

## Frontend Routes

Main routes currently wired in `src/App.tsx`:

### Public

- `/`
- `/login`
- `/admin/login`
- `/signup`
- `/forgot-password`
- `/services`
- `/professionals`
- `/professionals/:proId`
- `/about`, `/careers`, `/blog`, `/contact`, `/privacy`, `/terms`

### Protected

- `/messages` (authenticated users)
- `/dashboard` (role-based dashboard switch)
- `/book/:proId` (user role)
- `/pro-dashboard` (professional role)
- `/admin/dashboard` and `/admin/analytics` (admin role)

## Backend API Overview

Base prefix: `/api/v1`

Additional utility endpoints:

- `GET /health`
- `GET /` (root message)

Router groups:

| Group | Prefix | Purpose |
|---|---|---|
| Auth | `/auth` | Register, login, refresh, password reset, current user |
| Users | `/users` | User profile operations |
| Professionals | `/professionals` | Professional listing/profile updates/photo management |
| Categories | `/categories` | Service category listing/creation |
| Services | `/services` | Service listing/details/admin approval actions |
| Bookings | `/bookings` | Quote, create booking, lifecycle transitions, timeline |
| Reviews | `/reviews` | Create reviews and list professional reviews |
| Disputes | `/disputes` | Dispute creation, evidence upload, resolution |
| Notifications | `/notifications` | List and mark notifications as read |
| Messages | `/messages` | Conversations, messages, mark-as-read |
| Admin | `/admin` | Analytics, user moderation, KYC management |
| Tracking | `/tracking` | Booking tracking websocket endpoint |

Tracking websocket endpoint:

- `WS /api/v1/tracking/{booking_id}`

The API contract is implemented in `backend/src/server.js` and mirrors the frontend client in `src/api/client.ts`.

## Local Setup

### 1. Prerequisites

- Node.js 20+
- Docker Desktop (recommended for local services)

### 2. Clone and install frontend dependencies

```bash
npm install
```

### 3. Configure backend environment

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

If you are on Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Minimum required values to run:

- `DATABASE_URL`
- `SECRET_KEY`

Recommended for complete local setup:

- `REDIS_URL`
- `EMAIL_SECRET_KEY`

### 4. Start local dependencies

Start Postgres, Redis, and MailHog:

```bash
docker compose up -d db redis mailhog
```

### 5. Run backend

```bash
cd backend
npm install
npm run dev
```

### 6. Run frontend

From repository root in a separate terminal:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- MailHog UI: `http://localhost:8025`

### 7. Optional: run full stack with Docker Compose

```bash
docker compose up --build
```

This starts db, redis, mailhog, backend, and frontend together.

## Environment Variables

### Frontend

Frontend env values are read by Vite.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No (local), Yes (production) | empty | Backend origin in production (frontend app appends `/api/v1`) |
| `GEMINI_API_KEY` | Optional | empty | Optional key used by AI-related integrations |
| `APP_URL` | Optional | empty | App URL used by external hosting/integration contexts |

### Backend

Backend env values are defined in `backend/.env.example` and `backend/src/config.js`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | No | `development` | Runtime environment |
| `DEBUG` | No | `true` | Enables verbose debug behavior |
| `FRONTEND_URL` | No | `http://localhost:3000` | Primary allowed frontend origin |
| `CORS_ORIGINS` | No | empty | Additional comma-separated allowed origins |
| `AUTO_CREATE_TABLES` | No | `true` | Creates DB tables at startup (useful without migrations) |
| `DATABASE_URL` | Yes | none | PostgreSQL connection URL (`postgresql://...`) |
| `TEST_DATABASE_URL` | No | empty | Test DB URL |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection |
| `SECRET_KEY` | Yes | none | JWT signing secret |
| `ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token lifetime |
| `EMAIL_SECRET_KEY` | Recommended | empty | Token signing key for email flows |
| `MAIL_SERVER` | No | `localhost` | SMTP host |
| `MAIL_PORT` | No | `1025` | SMTP port |
| `MAIL_USERNAME` | No | empty | SMTP username |
| `MAIL_PASSWORD` | No | empty | SMTP password |
| `MAIL_FROM` | No | `noreply@servify.com` | Sender email |
| `MAIL_FROM_NAME` | No | `Servify` | Sender display name |
| `MAIL_STARTTLS` | No | `false` | STARTTLS toggle |
| `MAIL_SSL_TLS` | No | `false` | SSL/TLS toggle |
| `GOOGLE_CLIENT_ID` | Optional | empty | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | empty | OAuth client secret |
| `UPLOAD_DIR` | No | `uploads` | Upload storage directory |
| `MAX_FILE_SIZE_MB` | No | `10` | Upload max file size |
| `RATE_LIMIT_PER_MINUTE` | No | `60` | Global request rate limit |
| `AUTH_RATE_LIMIT_PER_MINUTE` | No | `5` | Auth endpoint rate limit |
| `PLATFORM_FEE` | No | `49.0` | Flat platform fee per booking |
| `DEFAULT_COMMISSION_RATE` | No | `0.20` | Professional commission rate |
| `GST_RATE` | No | `0.18` | Tax rate |

## Runbook: Common Commands

### Frontend

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # TypeScript type check
```

### Backend

```bash
cd backend
npm run dev
```

### Docker

```bash
docker compose up -d db redis mailhog
docker compose up --build
docker compose down
```

## Deployment

This repo is ready for free-tier deployment using Render + Neon + Upstash.

- Blueprint file: `render.yaml`
- Full guide: `docs/deploy-free.md`

Quick production checklist:

1. Set `DATABASE_URL` to your Neon/Postgres connection string.
2. Set `REDIS_URL` to your Upstash Redis URL.
3. Set `FRONTEND_URL` and `CORS_ORIGINS` on backend.
4. Set `VITE_API_BASE_URL` on frontend to backend origin.
5. Keep `AUTO_CREATE_TABLES=true` for initial bootstrap if migrations are not configured.

## Troubleshooting

### CORS errors in browser

- Verify backend `FRONTEND_URL` and `CORS_ORIGINS` include your exact frontend origin.
- Confirm `VITE_API_BASE_URL` points to the correct backend host.

### 401 Unauthorized after login

- Ensure `servify_token` exists in browser local storage.
- Check backend `SECRET_KEY` is set and stable between restarts.

### Database connection failures

- Confirm `DATABASE_URL` uses `postgresql://`.
- If using Docker, ensure `db` is healthy before backend starts.

### Uploads not persisting in production

- Render free web service storage is ephemeral.
- Use external object storage for persistent media in production.

## Notes

- Upload files are served from `/uploads` by the backend.
- Current startup path can auto-create tables via `AUTO_CREATE_TABLES`, which is useful for early-stage deployments.
