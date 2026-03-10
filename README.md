# Winston Unified

Single-repo Winston website app:
- React + TypeScript + Vite frontend
- Fastify server for static hosting + SPA routes

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
