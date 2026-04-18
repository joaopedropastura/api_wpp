FROM node:20-alpine AS base
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN yarn install --frozen-lockfile

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# ---- runner ----
FROM base AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
