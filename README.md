# Winston Unified

Single-repo project that combines:
- `WinstonWebsitething` frontend (React + TypeScript + Vite)
- `BackShots` proxy backend (`/seal/`, `/wisp/`, asset proxy routes) served by Fastify

## Local Development

```bash
npm install
npm run dev
```

## Production Build + Run

```bash
npm run build
npm start
```

Server starts on `0.0.0.0:$PORT` (defaults to `3000`).

## Render

This repository is configured for one Render web service via `render.yaml`.

- Build: `npm install && npm run build`
- Start: `npm start`

## Proxy Endpoints

- `/seal/`
- `/wisp/`
- `/assets/img/*`
- `/assets-fb/*`
- `/js/script.js`
- `/return?q=...`
- `/ds`
