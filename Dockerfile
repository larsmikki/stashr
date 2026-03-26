FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/

RUN npm ci

COPY tsconfig.base.json ./
COPY server/ server/
COPY client/ client/

RUN npm run build -w client
RUN npm run build -w server

# --- Production stage ---
FROM node:20-alpine

RUN apk add --no-cache ffmpeg curl

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/

RUN npm ci -w server --omit=dev

COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/server/src/db/migrations server/dist/db/migrations
COPY --from=builder /app/client/dist client/dist

RUN mkdir -p /app/data /app/cache/thumbnails /app/cache/transcoded

ENV NODE_ENV=production
ENV PORT=3010
ENV DATA_DIR=/app/data
ENV CACHE_DIR=/app/cache

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3010/api/health || exit 1

CMD ["node", "server/dist/index.js"]
