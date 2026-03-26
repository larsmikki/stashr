# Stashy

Self-hosted personal media gallery for browsing images and videos over LAN. Built with Node.js + Express + TypeScript on the backend and React + Vite + Tailwind CSS on the frontend, using SQLite (via sql.js/WASM) for persistence.

## Project Structure

```
stashy/
├── server/          # Express backend (Node.js + TypeScript)
│   └── src/
│       ├── routes/      # REST API handlers
│       ├── services/    # Business logic (album, auth, scanner, thumbnail, streaming, filesystem)
│       ├── db/          # SQLite connection, migrations
│       ├── middleware/  # Auth middleware
│       ├── utils/       # Path safety, MIME types, DB helpers, stream utils
│       ├── types/       # Shared TypeScript interfaces
│       └── __tests__/   # Vitest unit tests
└── client/          # React frontend (Vite + Tailwind)
    └── src/
        ├── pages/       # Home, Album, Settings, Login, NotFound
        ├── components/  # MediaGrid, MediaViewer, VideoPlayer, SlideshowMode, etc.
        ├── hooks/       # useMedia, useAlbums, useSlideshow, useSwipe
        ├── contexts/    # AuthContext, ThemeContext
        ├── api/         # Centralized API client
        └── utils/       # Error helpers
```

## Commands

### Development
```bash
npm run dev              # Start both server (:3010) and client (:5173) concurrently
npm run dev -w server    # Server only (tsx watch, hot reload)
npm run dev -w client    # Client only (Vite dev server)
```

### Build & Run
```bash
npm run build            # Build client then server (TypeScript compile)
npm start                # Run production build: node server/dist/index.js
```

### Testing
```bash
npm test -w server       # Run Vitest tests once
npm run test:watch -w server  # Vitest in watch mode
```

## Environment Variables

| Variable   | Default                | Description                         |
|------------|------------------------|-------------------------------------|
| `PORT`     | `3010`                 | Server port                         |
| `DATA_DIR` | `./data`               | SQLite database directory           |
| `CACHE_DIR`| `./cache`              | Thumbnail and transcode cache       |
| `NODE_ENV` | —                      | Set to `production` for static serving |

No `.env` file required — defaults in `server/src/config.ts` work for local dev.

## Architecture

### Backend
- **ES modules** throughout (`"type": "module"`). TypeScript imports require `.js` extensions.
- **Routes → Services → DB** layering. Routes call services; services call `getDb()` directly (sql.js).
- **Auth**: Bearer token middleware protects all `/api` routes except `/api/auth`.
- **Streaming**: range-request support for direct file streaming; HLS transcoding via `fluent-ffmpeg`.
- **Thumbnails**: `sharp` for images, `ffprobe`/`ffmpeg` for video frames. Batch processing with configurable concurrency.
- **Scanner**: Recursive filesystem walk, detects additions/removals/changes against DB, fires `onComplete` callback after scan.

### Frontend
- **React Router v7** for client-side routing.
- **HLS.js** for video playback with native fallback.
- **Tailwind CSS** with dark mode (`class` strategy).
- **Centralized API client** at `src/api/client.ts` — all fetch calls go through here with token management.
- Client dev server proxies `/api` to `http://localhost:3010`.

### Database
SQLite via sql.js (WASM). Migrations in `server/src/db/migrations/`. Tables: `albums`, `media_files`, `scan_state`, `settings`, `sessions`.

## Docker

```bash
# Build image
docker build -t stashy .

# Run with docker-compose (edit volumes in docker-compose.yml first)
docker compose up -d
```

The container expects:
- `/app/data` — persistent SQLite data (mount a volume)
- `/app/cache` — thumbnails and transcodes (mount a volume)
- `/media` (or wherever your media lives) — read-only media mount

## TypeScript Config

- Target: `ES2022`, strict mode enabled
- Server: `moduleResolution: bundler`, emits to `server/dist/`
- Client: `noEmit: true` (Vite handles bundling), `noUnusedLocals/Parameters: true`
- Shared base config: `tsconfig.base.json`

## Key Conventions

- All API error responses use `{ error: string }` shape
- File path safety enforced via `utils/paths.ts` (`ensureWithin`, `safePath`)
- Background jobs (scan, thumbnail generation, transcoding) are fire-and-forget with in-memory deduplication sets/maps
- `getErrorMessage(err, fallback)` from `utils/db.ts` used for consistent error extraction in route catch blocks
