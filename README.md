# Stashy

A self-hosted personal media gallery for browsing images and videos over LAN.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-larsmikki%2Fstashy-blue?logo=docker)](https://hub.docker.com/r/larsmikki/stashy)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-larsmikki%2Fstashy-blue?logo=github)](https://github.com/larsmikki/stashy/pkgs/container/stashy)
[![Node 20](https://img.shields.io/badge/Node-20-brightgreen?logo=node.js)](https://nodejs.org/)

![Stashy screenshot](resources/screenshot.png)

## Features

- **Album management** — Create albums pointing to folders on disk, drag-and-drop reorder
- **Recursive scanning** — Incremental scan detects additions, changes, and removals
- **Thumbnail caching** — Lazy generation with concurrent batch processing
- **Video playback** — Native streaming (MP4/WebM) with HLS transcoding for other formats
- **Slideshow mode** — Fullscreen slideshow with configurable timing (2–30s)
- **Keyboard & swipe navigation** — Arrow keys and touch gestures in the viewer
- **Server-side folder picker** — Browse the server's filesystem when creating albums
- **Pagination** — Configurable page size (50–500), persisted across sessions
- **Dark mode** — System-aware with manual toggle
- **Optional password protection** — Session-based auth for shared networks

## Docker (recommended)

### Quick start

**1. Edit `docker-compose.yml` to mount your media**

```yaml
services:
  stashy:
    image: larsmikki/stashy:latest
    container_name: stashy
    ports:
      - "3010:3010"
    volumes:
      - stash_data:/app/data        # database (persistent)
      - stash_cache:/app/cache      # thumbnails & transcodes (persistent)
      - /path/to/your/media:/media:ro  # your photos/videos (read-only)
    environment:
      - PORT=3010
    restart: unless-stopped

volumes:
  stash_data:
  stash_cache:
```

Mount as many media folders as you like — each becomes a path you can point an album at:

```yaml
volumes:
  - /mnt/nas/photos:/media/photos:ro
  - /mnt/nas/videos:/media/videos:ro
  - /home/user/screenshots:/media/screenshots:ro
```

**3. Start**

```bash
docker compose up -d
```

Open **http://localhost:3010**, go to **Settings → Add album**, and pick a folder (e.g. `/media/photos`).

---

### Updating

```bash
docker compose down
docker pull larsmikki/stashy:latest
docker compose up -d
```

Data and cache are in named volumes and survive rebuilds.

---

### Environment variables

| Variable   | Default    | Description                        |
|------------|------------|------------------------------------|
| `PORT`     | `3010`     | HTTP port                          |
| `DATA_DIR` | `/app/data`  | SQLite database directory          |
| `CACHE_DIR`| `/app/cache` | Thumbnail and transcode cache      |

---

### FFmpeg

FFmpeg is included in the Docker image (`ffmpeg` Alpine package). It is used for:
- Extracting video thumbnail frames
- Transcoding unsupported formats (MOV, MKV, AVI, M4V) to HLS on-demand

MP4 and WebM stream directly without transcoding.

---

## Supported formats

**Images:** JPG, JPEG, PNG, GIF, WebP, BMP, TIFF

**Videos:** MP4, WebM, MOV, MKV, AVI, M4V

---

## Development

### Prerequisites

- Node.js 20+
- FFmpeg on PATH (for video thumbnails and transcoding)

### Setup

```bash
npm install
npm run dev
```

- **Server** at http://localhost:3010
- **Client** at http://localhost:5173 (proxies `/api` to the server)

### Build

```bash
npm run build   # compiles client then server
npm start       # serves everything from :3010
```

### Tests

```bash
npm test -w server
```

---

## Security

- Path traversal blocked on all file-serving routes (`ensureWithin`, `safePath`)
- Null byte injection prevention
- Parameterized SQL queries throughout
- HLS segment names validated against an allowlist pattern
- JSON body limited to 1 MB
- Session tokens expire automatically
