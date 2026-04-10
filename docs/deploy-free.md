# Free Deployment Guide (Frontend + Backend)

This project can be deployed for free with:
- Frontend: Render Static Site (free)
- Backend: Render Web Service (free)
- PostgreSQL: Neon (free tier)
- Redis: Upstash Redis (free tier)

## 1. Prerequisites

1. Push this repo to GitHub.
2. Create accounts:
- Render
- Neon
- Upstash

## 2. Create Free Database (Neon)

1. Create a Neon project and database.
2. Copy the connection string.
3. Keep it as a standard Postgres URL:
- `postgresql://...`

## 3. Create Free Redis (Upstash)

1. Create a Redis database in Upstash.
2. Copy the TLS Redis URL (usually `rediss://...`).

## 4. Deploy on Render

This repo includes [render.yaml](../render.yaml) for one-click Blueprint deployment.

1. In Render, click `New` -> `Blueprint`.
2. Connect your GitHub repo.
3. Render will detect `render.yaml` and create:
- `servify-backend` (web service)
- `servify-frontend` (static site)

## 5. Set Backend Environment Variables

In `servify-backend` service settings, set:

- `DATABASE_URL` = your Neon URL (`postgresql://...`)
- `REDIS_URL` = your Upstash Redis URL (`rediss://...`)
- `FRONTEND_URL` = your frontend Render URL, e.g. `https://servify-frontend.onrender.com`
- `CORS_ORIGINS` = comma-separated allowed origins, e.g.
  `https://servify-frontend.onrender.com,http://localhost:5173`

Notes:
- `SECRET_KEY` and `EMAIL_SECRET_KEY` are generated automatically by Render from `render.yaml`.
- `AUTO_CREATE_TABLES=true` is enabled so first deploy can bootstrap tables.

## 6. Set Frontend Environment Variable

In `servify-frontend` static site settings:

- `VITE_API_BASE_URL` = backend URL only (no `/api/v1`), e.g.
  `https://servify-backend.onrender.com`

The frontend automatically appends `/api/v1`.

## 7. Redeploy and Verify

1. Trigger redeploy for backend and frontend.
2. Open backend health endpoint:
- `https://<backend-host>/health`
3. Open frontend and test:
- login/signup
- services list
- bookings
- messages

## 8. Important Free-Tier Notes

- Render free web services sleep after inactivity (cold starts expected).
- Local `uploads/` on free web service is ephemeral and can be lost on redeploy/restart.
- For persistent media storage, use an external object store (Cloudinary, S3, etc.).
