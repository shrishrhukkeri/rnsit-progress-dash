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

## Deploy (Render)
Static site auto-deploys from `main`. Config in `render.yaml` (SPA rewrite `/*` → `/index.html`).
