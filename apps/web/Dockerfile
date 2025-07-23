# ============================
# 1️⃣ Base Build Stage
# ============================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only necessary files for dependency installation
COPY package.json package-lock.json ./
COPY .npmrc .npmrc
COPY apps/web/package.json ./apps/web/package.json

# Optional: If you have shared packages
COPY packages/*/package.json ./packages/

# Install all dependencies across workspaces
RUN npm install --workspaces --include-workspace-root

# Copy entire monorepo to allow building
COPY . .

# Build Next.js app
WORKDIR /app/apps/web
RUN npm run build


# ============================
# 2️⃣ Final Production Image
# ============================
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy production files from builder
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Optional: Set a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["npm", "start"]
