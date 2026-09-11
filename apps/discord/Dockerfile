# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tini && rm -rf /var/lib/apt/lists/*
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
COPY packages/feature-flags/package.json packages/feature-flags/package.json
COPY packages/s3/package.json packages/s3/package.json
RUN bun install --frozen-lockfile

FROM deps AS runner
ARG BMHK_ENV
ARG COMMIT_SHA
ARG COMMIT_MSG
ARG BUILD_TRIGGERED_BY
ARG BUILD_TIMESTAMP
ENV BMHK_ENV=$BMHK_ENV
ENV COMMIT_SHA=$COMMIT_SHA
ENV COMMIT_MSG=$COMMIT_MSG
ENV BUILD_TRIGGERED_BY=$BUILD_TRIGGERED_BY
ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP
COPY . .

ENV NODE_ENV=production
ENV DISCORD_DB_PATH=/app/apps/discord/data/discord.sqlite
VOLUME ["/app/apps/discord/data"]
ENTRYPOINT ["tini", "-g", "--"]
CMD ["bun", "run", "--filter", "discord", "start"]
