# SOLID Fixes — Pre-Release

Suggested order: Fix 1 → Fix 3 → Fix 2 → Fix 4

---

## Fix 1 — Move `parseRange()` to `utils/stream.ts`

- [x] Create `server/src/utils/stream.ts` with `StreamRange` interface and `parseRange()` exported
- [x] Remove `StreamRange` + `parseRange` from `services/streaming.service.ts`; add import from `'../utils/stream.js'`
- [x] Update `routes/streaming.ts` line 6: import `parseRange` from `'../utils/stream.js'` instead of the service
- [x] Update `__tests__/parseRange.test.ts` line 2: import from `'../utils/stream.js'`
- [x] Run tests to verify

---

## Fix 2 — Remove direct DB access from `routes/streaming.ts`

- [x] Add `getMediaById(mediaId: number): MediaFile | null` to `services/streaming.service.ts` (move SQL from route)
- [x] Add `getAlbumPath(albumId: number): string | null` to `services/streaming.service.ts` (move SQL from route)
- [x] In `routes/streaming.ts`: remove local `getMedia()` + `getAlbumPath()` functions and their `getDb`/`rowToMedia` imports
- [x] Import `getMediaById` + `getAlbumPath` from streaming.service and update call sites

---

## Fix 3 — Decouple scanner from thumbnail generation

- [x] Remove `import { generatePendingThumbnails }` from `services/scanner.service.ts`
- [x] Remove `generatePendingThumbnails(album.id).catch(...)` block from `performScan()`
- [x] Add optional `onComplete?: (albumId: number) => void` param to `startScan()`
- [x] Chain `.then(() => onComplete?.(album.id))` in `startScan()` fire-and-forget
- [x] In `routes/albums.ts` `POST /:id/scan`: pass `startScan(album, (id) => startThumbnailGeneration(id))`
- [x] Leave `POST /scan-all` unchanged (no thumbnail auto-trigger there)

---

## Fix 4 — Standardize error handling across routes

- [x] `routes/media.ts`: wrap `GET /:albumId/media` handler in try/catch with `getErrorMessage`
- [x] `routes/home.ts`: wrap `GET /` handler in try/catch with `getErrorMessage`
- [x] `routes/thumbnails.ts`: add try/catch around initial DB lookup
- [x] `routes/streaming.ts`: wrap all 4 route handlers in try/catch
- [x] `routes/albums.ts`: add try/catch to `GET /`, `GET /:id`, `GET /:id/scan-status`, `GET /:id/thumbnail-status`, `POST /:id/scan`, `POST /scan-all`

---

## Review

- [x] TypeScript compiles without errors (`npm run build`)
- [x] All tests pass (42/42)
