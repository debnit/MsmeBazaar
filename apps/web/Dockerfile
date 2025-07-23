# ============================
# 1️⃣ Build Stage
# ============================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/*/package.json ./packages/

# Install all deps across monorepo
RUN npm install --workspaces --include-workspace-root

# Copy full monorepo
COPY . .

# Build Next.js frontend
WORKDIR /app/apps/web
RUN npm run build

# ============================
# 2️⃣ Production Runtime
# ============================
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy production bits only
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Use unprivileged user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["npm", "start"]
