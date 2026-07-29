# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY apps/discord/package.json apps/discord/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/staff/package.json apps/staff/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
RUN bun install --frozen-lockfile

FROM deps AS runner
COPY . .
RUN bun run --filter server build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "apps/server/dist/main.mjs"]
