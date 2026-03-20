# ── Stage 1: build ──────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: production ──────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Patch system packages
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --omit=dev

COPY --chown=appuser:appgroup --from=builder /app/dist ./dist

EXPOSE 3000

# dumb-init handles signals properly (SIGTERM → graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]