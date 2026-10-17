# RNSIT Progress Dash

Mobile-first PWA for tracking milestones across **NEXA**, **Concierge**, and **VarchLearn**.

**Live:** https://rnsit-progress-dash.onrender.com  
**Repo:** https://github.com/shrishrhukkeri/rnsit-progress-dash

## Features
- No login required to **view** progress (faculty / supervisors)
- Student **login** required to edit duration, mark milestones, add delay reasons, and achievement notes
- **Robust Persistence & Cloud Sync**:
  - Edits are saved locally in the browser (`localStorage` + redundant backup).
  - Automatically synced to the Render Node server (`/api/state`).
  - Seamless recovery scans for earlier browser sessions.
  - Built-in **Data & Backup** modal: 1-click Download JSON, Import JSON, and Copy seed.ts code.
- Light mode by default; dark mode toggle (top right)
- Home: 3 project cards → project roadmap → Back
- Offline-capable via service worker (vite-plugin-pwa)

## Demo credentials
- Username: `student`
- Password: `rnsit2026`

## Run
```bash
npm install
npm run dev
```

## Build & Start
```bash
npm run build
npm start
```

## Health check & API
- `GET /health` → `{ "status": "ok", "service": "...", "uptime": N, "timestamp": "..." }`
- `GET /api/state` → returns saved milestone data
- `PUT /api/state` → updates and persists roadmap data

Cron URL (every 5–10 min keeps free web service warm):
```text
https://rnsit-progress-dash.onrender.com/health
```
Use cron-job.org / UptimeRobot, or a paid Render Cron Job.

## Permanent 24/7 Cloud Storage (Render Free Tier)
Render's free web services have an ephemeral container filesystem (resetting on container rebuilds).
The dashboard automatically heals the server from your browser's saved edits whenever you visit. To make the server retain state permanently in the cloud 24/7 even without any browser open:

### Option A: Free Upstash Redis (100% Free Forever)
1. Create a free database at [upstash.com](https://upstash.com) (no credit card).
2. In your Render Dashboard → Service → **Environment**, add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Option B: Commit Latest Milestones to Git
Open the **Cloud Sync & Data Backup** modal in the app top bar → click **"Save permanently into Git (seed.ts code)"** → copy and paste into `src/data/seed.ts` and commit.

## Deploy (Render)
Node web service auto-deploys from `main` (`npm ci && npm run build` → `npm start`). See `render.yaml`.
