# ── Stage 1: build ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate --config prisma.config.ts

COPY . .
RUN npm run build

# ── Stage 2: production ──────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk update && apk upgrade --no-cache
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads && chown appuser:appgroup /app/uploads

COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --omit=dev

COPY --chown=appuser:appgroup --from=builder /app/src/generated ./src/generated
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist
COPY --chown=appuser:appgroup prisma ./prisma
COPY --chown=appuser:appgroup prisma.config.ts ./

USER appuser

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy --config prisma.config.ts && node dist/main"]
