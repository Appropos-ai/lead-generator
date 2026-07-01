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
COPY packages/frontend/ packages/frontend/
RUN pnpm --filter @lead-generator/shared build && \
    pnpm --filter @lead-generator/frontend build

# ---- runner ----
FROM nginx:alpine
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
