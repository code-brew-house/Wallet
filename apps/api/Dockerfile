FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/smoke/package.json ./apps/smoke/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY apps/api ./apps/api
RUN bun --cwd apps/api prisma generate
RUN bun run --filter @wallet/api build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock /app/tsconfig.base.json ./
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/smoke/package.json ./apps/smoke/package.json
RUN bun install --frozen-lockfile --production
EXPOSE 4000
CMD ["bun", "--cwd", "apps/api", "src/main.ts"]
