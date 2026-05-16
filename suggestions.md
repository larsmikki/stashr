# Stashy — Improvement Suggestions

Three high-impact suggestions per category, ordered by impact.

## 1. Codebase Optimization

### 1.1 Replace `sql.js` with `better-sqlite3`
**Files:** `server/src/db/connection.ts`, callers of `saveDb()` throughout services

The current DB layer loads the whole SQLite file into memory at boot, and `saveDb()` re-serializes and rewrites the **entire** database file on every mutation (album create, scan progress update, favorite toggle, etc.). For libraries with tens of thousands of media files this is O(db size) per write, hammers the disk, and risks corruption on crash mid-write.

`better-sqlite3` is a synchronous native binding to real SQLite: WAL journaling, durable atomic writes, prepared statements with much faster reads/writes, and no `saveDb()` plumbing. Migration is mostly mechanical — `db.run`/`db.exec` translate to `db.prepare(...).run(...)` / `db.prepare(...).all(...)` — and lets you delete every call to `saveDb()`. Expected: large-album scans go from seconds-of-IO-per-batch to ~instant, and the codebase shrinks.

### 1.2 Stream scans incrementally and batch writes in transactions
**File:** `server/src/services/scanner.service.ts`

`walkDirectory` uses **synchronous** `fs.readdirSync` + `fs.statSync` recursively before any DB work begins, building a full in-memory list of every file on disk. On a 100k-file library this blocks the Node event loop for many seconds (all HTTP requests stall) and peaks memory. Each `db.run` is also a separate write because of the sql.js model (point 1.1).

Switch to `fs.promises.opendir` (async iterator) and process files in batches of e.g. 500 inside a single transaction (`BEGIN`/`COMMIT`). Combined with 1.1 this turns scans from "freeze the server" into a background job that progressively reports progress and never blocks the request loop.

### 1.3 Fix the mutation anti-pattern in album/favorite updates
**Files:** `client/src/pages/AlbumPage.tsx:69-74`, `client/src/pages/FavoritesPage.tsx`, `useMedia` hook

`handleFavoriteToggle` does `items[idx] = updated` — directly mutating the array returned from the `useMedia` hook. React doesn't see a state change, so the grid doesn't always re-render with the new favorite state; the only reason it appears to work is that `ThumbnailCard` keeps its own `useState` copy. This is a latent bug for any consumer that reads `media.is_favorite` from props.

Lift the items state into `useMedia` and return a `mutate(updated)` setter that does `setItems(prev => prev.map(...))`. Same fix removes the duplicated favorite state across `ThumbnailCard` and `MediaViewer`, making the data flow single-source-of-truth.

---

## 2. Features & Functions

### 2.1 Full-text search across albums and filenames
There is no search anywhere in the app — the only way to find a specific photo is to remember which album it's in and page through. For a "personal media gallery" this is the single biggest missing capability.

Add a `?q=` parameter on `GET /api/albums/:id/media` and a global `GET /api/search?q=` endpoint backed by a SQLite FTS5 virtual table on `filename` + `relative_path` (cheap to maintain via triggers on `media_files`). A search bar in the top nav with debounced input and result thumbnails would cover 90% of "where is that one picture" workflows.

### 2.2 Bulk select & actions in the grid
Today every action is one item at a time: favoriting 50 photos = 50 clicks. Add a multi-select mode (long-press on mobile, shift/ctrl-click on desktop) with a floating action bar that supports: favorite/unfavorite, move to album, delete-from-disk (gated behind a setting), and download as zip.

This unlocks real curation workflows and is the natural follow-on to the favorites feature you already have.

### 2.3 EXIF metadata extraction + filter/sort by date taken
The scanner currently records `mtime`/`birthtime` from the filesystem, which is often the import date, not the capture date. Reading EXIF (`exifr` or `sharp.metadata()`) during scan gets the real date-taken, camera/lens, GPS, and dimensions.

That alone unlocks: sort by capture date (much more useful than file mtime), a timeline/year view, filter by camera, and a future map view. Store it in a `media_metadata` table keyed by `media_file_id` so the core table stays slim.

---

## 3. UI/UX Improvements

### 3.1 Virtualized / infinite-scrolling grid
**File:** `client/src/components/MediaGrid.tsx`

The grid renders every item in the current page as a real DOM node, and `ThumbnailCard` is fairly heavy (button + nested SVGs + hover overlay). At the maximum 500 items/page the page becomes janky to scroll on lower-end devices. Pagination controls are also a worse fit than continuous scrolling for a gallery.

Adopt `react-virtuoso` (`VirtuosoGrid`) or `@tanstack/react-virtual` and switch to cursor-based infinite scroll using the existing `page` API. This makes "albums with 50k files" feel as fast as "albums with 50 files," and removes the awkward Previous/Next buttons.

### 3.2 Image zoom & pan in the viewer
**File:** `client/src/components/MediaViewer.tsx:141-147`

The viewer fits images to the screen (`object-contain`) with no way to zoom in. For high-resolution photos this is a missed feature — users can't inspect details. Add pinch-to-zoom on touch and scroll-wheel/double-click zoom on desktop, with pan once zoomed.

`react-zoom-pan-pinch` or `panzoom` are drop-in. While you're there, also display dimensions/filename/date in a collapsible info panel (toggled with `i`) — that's currently only visible as a faint hover overlay on the thumbnail.

### 3.3 Replace "Loading…" text with skeleton thumbnails and toast feedback
**Files:** `client/src/pages/AlbumPage.tsx:119-120`, `FavoritesPage.tsx`, `App.tsx:17`

Every async state currently shows a centered gray "Loading..." string, which causes a full layout shift when results arrive and gives no sense of how many items are coming. Render a grid of skeleton/shimmer placeholder cards matching the expected page size so the layout is stable and the perceived load is faster.

Pair this with a small toast system (`sonner` or `react-hot-toast`) for the silent failures that currently `catch {}` — favorite toggles, scan errors, viewer load failures. Today these fail invisibly, which is the worst-of-both: the user doesn't know what worked.
