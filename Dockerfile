# Build API @workspace/backend (monorepo pnpm)
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib ./lib
COPY artifacts/backend ./artifacts/backend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/backend run build
RUN pnpm prune --prod --config.confirmModulesPurge=false

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app /app

WORKDIR /app/artifacts/backend

EXPOSE 8080

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
