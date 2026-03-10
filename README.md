# The Bouncer

A narrative decision game built with React + Vite + TypeScript where you play as the bouncer: you decide who gets in, manage reputation and cash, and handle boss calls and special cases.

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
   `PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')`
   `gcloud secrets add-iam-policy-binding GEMINI_API_KEY --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"`

### Deploy

`gcloud builds submit --config cloudbuild.yaml --substitutions _REGION=us-central1,_SERVICE=the-bouncer,_REPOSITORY=the-bouncer`

After deploy, get the URL:
`gcloud run services describe the-bouncer --region us-central1 --format='value(status.url)'`

## Proof of Google Cloud Deployment

For proof recording (30-90s), show:
1. Cloud Run service `the-bouncer` in Google Cloud Console.
2. Recent request logs in Cloud Run Logs.
3. The service URL responding (open app and/or hit `/api/gemini/generate-content` via request).

## Main Structure

- `src/components/`: game UI and visual logic
- `src/services/gemini.ts`: character, voice, and event generation with Gemini
- `src/types.ts`: shared types and global game state
- `src/lib/`: audio utilities and helpers
