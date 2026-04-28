# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **Mahi AI** (`artifacts/mahi-ai`) — voice-first emotional AI companion. Frontend-only React + Vite app that talks to the Google Gemini Live API directly from the browser using the user's own API key (stored in `localStorage`). Includes its own audio capture (PCM16 @16kHz), playback (PCM16 @24kHz with jitter buffer), VAD-based interruption handling, animated character orb that emotes via tool calls, and on-device session memory summarized after each chat.
  - Live model: `gemini-live-2.5-flash-preview`
  - Text model (validation + memory summary): `gemini-2.5-flash`
  - Tools exposed to the model: `updateCharacterState({ emotion })`, `openWebsite({ url })`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend (mahi-ai)**: React 19 + Vite + Tailwind v4 + Framer Motion + `@google/genai`
- **API framework (scaffolded, unused by mahi-ai)**: Express 5
- **Database (scaffolded, unused by mahi-ai)**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/mahi-ai run dev` — run the Mahi AI web app locally
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
