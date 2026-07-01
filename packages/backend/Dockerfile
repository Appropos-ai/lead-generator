# ---- builder ----
FROM node:23-slim AS builder
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

# Copy manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
RUN pnpm --filter @lead-generator/shared build && \
    pnpm --filter @lead-generator/backend build
# tsc doesn't copy .sql migration files
RUN cp -r packages/backend/src/db packages/backend/dist/db

# ---- runner ----
FROM node:23-slim
WORKDIR /app

# Copy full pnpm dependency tree (symlinks to .pnpm store must be preserved)
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/backend/node_modules/ ./packages/backend/node_modules/
COPY --from=builder /app/packages/shared/node_modules/ ./packages/shared/node_modules/

# Copy built output
COPY --from=builder /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/backend/dist/ ./packages/backend/dist/
COPY --from=builder /app/packages/backend/package.json ./packages/backend/

WORKDIR /app/packages/backend
EXPOSE 3001
CMD ["node", "dist/index.js"]
