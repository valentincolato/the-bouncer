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
- `npm run lint`: type check (`tsc --noEmit`)
- `npm run clean`: remove `dist/`

## Main Structure

- `src/components/`: game UI and visual logic
- `src/services/gemini.ts`: character, voice, and event generation with Gemini
- `src/types.ts`: shared types and global game state
- `src/lib/`: audio utilities and helpers
