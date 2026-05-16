# Deployment

This app is split into three production pieces:

- Frontend: Vercel static Vite app from `artifacts/repair-tracker`
- API: Render Node web service from `artifacts/api-server`
- Database: hosted PostgreSQL, for example Neon, Supabase, Railway, or Render Postgres

## 1. Create the production database

Create a hosted PostgreSQL database and copy its connection string.

Use that connection string as `DATABASE_URL` in the API host. If your provider offers pooled and direct URLs, use the pooled URL for the running web app unless your provider says otherwise.

After `DATABASE_URL` is available locally or in CI, push the schema:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
```

## 2. Deploy the API to Render

This repository includes `render.yaml` for the API service.

Render settings:

- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
- Start command: `pnpm --filter @workspace/api-server run start`
- Health check path: `/api/healthz`

Environment variables:

```text
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

After deployment, confirm the API health endpoint:

```bash
curl https://your-render-service.onrender.com/api/healthz
```

Expected response:

```json
{"status":"ok"}
```

## 3. Deploy the frontend to Vercel

Create a Vercel project from this repository and set the project root directory to:

```text
artifacts/repair-tracker
```

The `artifacts/repair-tracker/vercel.json` file sets:

- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `cd ../.. && pnpm --filter @workspace/repair-tracker run build`
- Output directory: `dist/public`

Before deploying, update the API rewrite destination in:

```text
artifacts/repair-tracker/vercel.json
```

Change:

```json
"destination": "https://repair-tracker-project.onrender.com"
```

to your Render API URL.

## 4. Smoke test production

Open the Vercel URL and check:

- Dashboard loads
- Repairs list loads
- Creating a repair writes to the production database
- Settings categories/custom fields load

If API calls fail, check these first:

- Vercel rewrite destination points to the Render API URL
- Render has `DATABASE_URL`
- Render health check returns `{"status":"ok"}`
- `CORS_ORIGIN` matches the Vercel production URL, or remove it if requests only go through Vercel rewrites
