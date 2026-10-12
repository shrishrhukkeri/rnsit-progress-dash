# RNSIT Progress Dash

Mobile-first PWA for tracking milestones across **NEXA**, **Concierge**, and **VarchLearn**.

## Features
- No login required to **view** progress (faculty / supervisors)
- Student **login** required to mark milestones, add delay reasons, and achievement notes
- Light mode by default; dark mode toggle (top right)
- Home: overall progress ring + 3 project cards
- Project detail: completed / pending / delayed + full roadmap
- Offline-capable via service worker (vite-plugin-pwa)

## Demo credentials
- Username: `student`
- Password: `rnsit2026`

## Run
```bash
cd dashboard
npm install
npm run dev
```

Open the local URL on a phone or Chrome device mode. Use “Add to Home Screen” for PWA install.

## Build
```bash
npm run build
npm run preview
```
