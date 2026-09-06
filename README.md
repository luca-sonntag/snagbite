# 🍳 Snagbite — Instagram Reel Recipe Extractor

Snagbite turns Instagram / social cooking Reels into rich, structured recipes. A
user shares a Reel, the backend scrapes the video, extracts frames, and sends them
to Google Gemini (structured JSON output) to produce a detailed, culinary-correct
recipe that the app renders as an interactive cooking guide.

This is an npm-workspaces monorepo:

| Workspace | Stack | Role |
|-----------|-------|------|
| `backend/` | Express + TypeScript | **API-only** service: recipe extraction, jobs, auth, billing sync, admin. Deployed on **Railway** (Docker). |
| `frontend/` | React 19 + Vite + TypeScript + Capacitor | **Native Android app** (Capacitor). Shipped via the **Google Play Store**. |

> The canonical, in-depth architecture/context document is [`AGENTS.md`](./AGENTS.md).
> Supplementary docs live in [`docs/`](./docs) (styleguide, scaling plan, provider contracts).

---

## 🛠️ How extraction works

1. **Submit** — the app sends a Reel URL to `POST /api/extract-recipe`; the backend creates a
   `pending` job in Supabase and returns a `jobId`.
2. **Scrape** — a background worker resolves the video through a provider chain
   (RapidAPI → local `yt-dlp` → first-party Apify actor as fallback).
3. **Frames** — the downloaded media is processed with **ffmpeg** to extract representative frames.
4. **AI** — frames + caption are sent to **Google Gemini** with a strict JSON schema to produce
   the structured recipe.
5. **Poll** — the client polls `GET /api/jobs/:id` for status changes and the final recipe.

Data (jobs, recipes, collections, favorites, users) is stored in **Supabase Postgres** with RLS;
auth is verified via Supabase JWKS (`jose`); premium entitlements sync via **RevenueCat**.

The backend can run as `ROLE=web`, `ROLE=worker`, or `ROLE=both` (see `backend/.env.example`).

---

## 🚀 Getting Started

### Prerequisites
* Node.js v20+
* `ffmpeg` + `python3` available locally (for frame extraction / `yt-dlp`) — the Docker image installs these automatically.
* Accounts/keys: RapidAPI, Google Gemini, Supabase, (optional) Apify, RevenueCat.

### Install
```bash
npm install
```

### Configure environment
```bash
# Backend
cp backend/.env.example backend/.env   # fill in RapidAPI / Gemini / Supabase / RevenueCat keys

# Frontend (Vite)
#   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
#   VITE_REVENUECAT_ANDROID_API_KEY, VITE_API_BASE_URL
```

### Run in development
Runs backend (`tsx watch`) and frontend (`vite`) together:
```bash
npm run dev
```
The Vite dev server proxies `/api` to the backend on `localhost:3000`.

---

## 🧪 Dev / mobile-preview environment

For the *develop-on-the-go → test on your phone → merge* loop, the frontend can be built as a
static web preview against a shared **dev backend + dev Supabase**, and a
**test-user auto-login** (`VITE_TEST_LOGIN=true`) skips the login screen so the authenticated UI
renders in a mobile browser. Quick local run:

```bash
# fill frontend/.env.development.local with the dev Supabase + test-user creds (git-ignored)
npm run dev -w frontend        # auto-logs-in as the test user
# provision the test user once (from backend/):
SEED_TEST_USER_PASSWORD=… npm run seed:dev -w backend
```

Full setup (self-hosted Supabase on Railway, per-PR previews, user provisioning) is documented in
[`docs/dev-environment.md`](./docs/dev-environment.md).

---

## 📱 Building the Android app (Capacitor)

From `frontend/`:
```bash
npm run cap:sync         # build web assets + sync into the Android project
npm run cap:run          # build, sync, and run on a device/emulator
npm run cap:run:local    # static build in APK (no live-reload) pointing to local backend
npm run cap:live         # wireless/USB live-reload (local frontend + local backend)
npm run cap:live:cloud   # live-reload pointing to Railway cloud dev backend
```

Release + Play Store upload are automated via the PowerShell scripts in `frontend/scripts/`
(`release.ps1`, `deploy-playstore.ps1`) and orchestrated from the repo root by `deploy.ps1`:
```powershell
npm run deploy                 # interactive: backend and/or app
npm run deploy:all:internal    # bump + backend deploy + app to Play internal track
```

---

## ☁️ Deployment

* **Backend → Railway.** Railway builds the root [`Dockerfile`](./Dockerfile) (multi-stage,
  `node:22-alpine`, ffmpeg/python3 at runtime). Deploy is triggered by `deploy.ps1` merging
  `develop → master` and pushing tags. The container is **API-only** — it does not serve a web frontend.
* **App → Google Play.** `frontend/scripts/deploy-playstore.ps1` builds a signed AAB and uploads it
  to the configured track.

---

## 📡 API Reference

### Submit a recipe extraction job
* **Endpoint:** `POST /api/extract-recipe`
* **Body:** `{ "url": "https://www.instagram.com/reel/…/" }`
* **Response (202):**
  ```json
  { "success": true, "jobId": "q8z46p9u8", "status": "pending" }
  ```

### Get job status and extracted recipe
* **Endpoint:** `GET /api/jobs/:id`
* **Response (200):**
  ```json
  {
    "success": true,
    "job": {
      "id": "q8z46p9u8",
      "url": "https://www.instagram.com/reel/…/",
      "status": "completed",
      "recipe": {
        "title": "Creamy Tuscan Chicken Pasta",
        "servings": 4,
        "ingredients": [
          { "name": "chicken breast", "amount": 2, "unit": "pieces", "notes": "sliced" }
        ],
        "instructions": [
          { "step": 1, "description": "Boil the pasta in salted water until al dente." }
        ]
      }
    }
  }
  ```

See `backend/src/routes.ts` for the full endpoint list (jobs, remix, chat, collections,
favorites, extraction limits, billing sync, feedback, admin, push-notification tokens).
A `GET /health` endpoint reports DB connectivity and role.

### Smart AI push notifications

The worker can generate personalized, context-aware push notifications from a user's saved
cookbook (season, weekday/time, save-age, favorites, tags) and deliver them via **FCM**, with
frequency capping and opt-in categories. Ships **off** (`NOTIFICATIONS_ENABLED=false`); see
[`docs/push-notifications.md`](./docs/push-notifications.md) for the design, notification-type
catalog, and how to enable it (Firebase project + `google-services.json` + a new AAB release).
