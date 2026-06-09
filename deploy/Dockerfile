# syntax=docker/dockerfile:1.20
# Stage 1: Build
FROM oven/bun:1.3.14 AS builder
WORKDIR /app

# Cache dependency install (workspaces: apps/*, packages/* including packages/test)
COPY package.json bun.lock ./
COPY patches ./patches
COPY --parents apps/*/package.json packages/*/package.json oss/packages/protocol/package.json ./

# --ignore-scripts: prepare hooks (husky, crypto-utils sync:wasm) need full tree or committed assets
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile --ignore-scripts

COPY . .

# Compiled server (root scripts/build.ts → apps/server compile)
RUN bun run build -- --server

# Stage 2: Runtime + Infisical CLI (secrets at start via machine identity)
FROM debian:bookworm-slim AS release
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates bash \
	&& curl -1sLf "https://artifacts-cli.infisical.com/setup.deb.sh" | bash \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends infisical \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/server/out/server .
COPY --from=builder /app/apps/server/out/worker .
COPY --from=builder /app/apps/server/out/worker-healthcheck .
COPY --from=builder /app/packages/crypto-utils/assets/dilithium.wasm ./assets/dilithium.wasm
COPY apps/server/scripts/infisical-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV INFISICAL_DISABLE_UPDATE_CHECK=true
EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["./server"]
