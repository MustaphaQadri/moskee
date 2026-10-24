# syntax=docker/dockerfile:1

# Multi-stage build for the Moskee Next.js app.
#
# Targets:
#   runner  -> minimal production image (Next.js standalone server)
#   builder -> full workspace with dev deps; reused by docker-compose for
#              one-off commands (prisma migrate deploy / db seed)

FROM node:22-alpine AS base
RUN npm install -g pnpm@10.18.1
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholders only. They satisfy Prisma config / Better Auth during `next
# build`; the real values are injected at runtime via the container env.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ARG BETTER_AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ARG BETTER_AUTH_URL="http://localhost:3000"
# Keep Server Action IDs stable across deployments. Without a fixed key Next.js
# generates a new one per build, so tabs opened before a deploy send unknown
# action IDs and fail with "Failed to find Server Action".
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=""
ENV DATABASE_URL=$DATABASE_URL \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    BETTER_AUTH_URL=$BETTER_AUTH_URL \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm db:generate && pnpm build

# --- Runtime ---
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
