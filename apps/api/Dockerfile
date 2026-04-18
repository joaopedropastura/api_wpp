FROM node:20-alpine AS base
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN yarn install --frozen-lockfile --production=false

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
WORKDIR /app/apps/api
RUN npx prisma generate
RUN yarn build

# ---- runner ----
FROM base AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/api/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main"]
