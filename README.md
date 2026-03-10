# The Bouncer

A narrative decision game built with React + Vite + TypeScript where you play as a nightclub bouncer. Each night you face a queue of AI-generated guests with unique backstories, IDs, and archetypes. You decide who gets in and who gets turned away — balancing cash, reputation, and your boss's increasingly unreasonable demands. The boss calls you mid-shift with tips, scoldings, or special instructions. Make the wrong calls too many times and you're fired.

All characters, dialogue, and voice interactions are generated in real-time by Gemini.

## Stack

- React 19
- Vite 6
- TypeScript
- Gemini API (`@google/genai`)
- Tailwind CSS 4

## Requirements

- Node.js 20+
- npm 10+
- Gemini API key

## Setup

1. Install dependencies:
   `npm install`
2. Create your local env file:
   `cp .env.example .env.local`
3. Set your key:
   `GEMINI_API_KEY=...`

## Scripts

- `npm run dev`: local server at `http://localhost:3000`
- `npm run build`: production build
- `npm run preview`: preview the production build
- `npm run start`: production server for Cloud Run (port `8080`)
- `npm run lint`: type check (`tsc --noEmit`)
- `npm run clean`: remove `dist/`

## Deploy to Google Cloud Run

This repo includes:
- `Dockerfile` for containerizing the app + Gemini proxy endpoints.
- `cloudbuild.yaml` for CI build/push/deploy to Cloud Run.

### One-time setup (per GCP project)

1. Set your project:
   `gcloud config set project YOUR_PROJECT_ID`
2. Enable APIs:
   `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com`
3. Create Artifact Registry Docker repo:
   `gcloud artifacts repositories create the-bouncer --repository-format=docker --location=us-central1`
4. Create secret for Gemini key:
   `printf "%s" "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-`
   If the secret already exists:
   `printf "%s" "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-`
5. Grant Cloud Run runtime account access to the secret:
   ```
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```
6. Grant Cloud Build service account the permissions it needs to push images and deploy:
   ```
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
   CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

   # Push images to Artifact Registry
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:${CB_SA}" --role="roles/artifactregistry.writer"

   # Deploy to Cloud Run
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:${CB_SA}" --role="roles/run.admin"

   # Act as the compute service account during deploy
   gcloud iam service-accounts add-iam-policy-binding \
     "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --member="serviceAccount:${CB_SA}" --role="roles/iam.serviceAccountUser"
   ```

### Deploy

Deploys are **manual** — there is no automatic deploy on push. To deploy, run:

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions _REGION=us-central1,_SERVICE=the-bouncer,_REPOSITORY=the-bouncer
```

This triggers Cloud Build to:
1. Build the Docker image
2. Push it to Artifact Registry
3. Deploy it to Cloud Run (tagged as `latest`)

After deploy, get the service URL:
```bash
gcloud run services describe the-bouncer --region us-central1 --format='value(status.url)'
```

## Architecture

The app is a React SPA served by `vite preview` in production. Gemini API calls are **never made from the browser** — instead, `vite.config.ts` registers a middleware plugin that exposes two server-side endpoints:

- `POST /api/gemini/generate-content` — text/JSON generation (characters, dialogue, TTS)
- `POST /api/gemini/live-token` — ephemeral token for Gemini Live API (boss voice calls)

The `GEMINI_API_KEY` is consumed exclusively by this middleware. In Cloud Run it's injected via Secret Manager; locally it's read from `.env.local`.

```
Browser (React) → fetch('/api/gemini/*') → Vite Middleware (vite.config.ts) → Gemini API
```

## Main Structure

- `src/components/Game.tsx`: main game loop, boss voice sessions, shift logic
- `src/components/CharacterCard.tsx`: guest display with ID card and decision buttons
- `src/components/HUD.tsx`: reputation, cash, and night progress
- `src/components/Phone.tsx`: boss call UI
- `src/components/GuestList.tsx`: queue of pending guests
- `src/services/gemini.ts`: all Gemini calls (characters, dialogue, TTS, images)
- `src/types.ts`: shared types and global game state
- `src/lib/audio.ts`: audio playback utilities
- `src/lib/utils.ts`: general helpers
