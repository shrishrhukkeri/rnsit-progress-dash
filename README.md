# RNSIT Progress Dash

Mobile-first PWA for tracking milestones across **NEXA**, **Concierge**, and **VarchLearn**.

**Live:** https://rnsit-progress-dash.onrender.com  
**Repo:** https://github.com/shrishrhukkeri/rnsit-progress-dash

## Features
- No login required to **view** progress (faculty / supervisors)
- Student **login** required to mark milestones, add delay reasons, and achievement notes
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

## Build
```bash
npm run build
npm run preview
```

## Health check
`GET /health` → `{ "status": "ok", "service": "...", "uptime": N, "timestamp": "..." }`

Cron URL (every 5–10 min keeps free web service warm):
```text
https://rnsit-progress-dash.onrender.com/health
```
Use cron-job.org / UptimeRobot, or a paid Render Cron Job.

## Deploy (Render)
Node web service auto-deploys from `main` (`npm ci && npm run build` → `npm start`). See `render.yaml`.
