# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: production ────────────────────────────────────────────────────────
# WHY: bcrypt uses native bindings compiled against the running node version.
# We install python3/make/g++ so `npm ci` can rebuild it from source in the
# final image (same Alpine, same arch, same node) — no "invalid ELF header".
FROM node:22-alpine AS production

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main"]
