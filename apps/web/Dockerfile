# ============================
# 1️⃣ Build Stage
# ============================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root-level package files
COPY package.json package-lock.json ./
COPY .npmrc .npmrc

# Copy project-specific and workspace package.json files
COPY apps/web/package.json ./apps/web/package.json
COPY packages/*/package.json ./packages/

# Install dependencies (monorepo aware)
RUN npm install --workspaces --include-workspace-root

# Copy entire monorepo after installing deps to maximize cache efficiency
COPY . .

# Build the Next.js app
WORKDIR /app/apps/web
RUN npm run build

# ============================
# 2️⃣ Production Runtime Stage
# ============================
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only copy necessary files to reduce image size
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# If your app uses shared packages, copy them here too
COPY --from=builder /app/packages ./packages

# Set a non-root user (recommended)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]
