FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/smoke/package.json ./apps/smoke/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY apps/web ./apps/web
RUN bun run --filter @wallet/web build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["bun", "apps/web/server.js"]
