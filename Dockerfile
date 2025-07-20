# 🏗️ Base image for building the app
FROM node:18-alpine AS base

# Install required system packages
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Use separate COPY to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install all deps including devDeps for build
RUN npm ci

# Copy the rest of the code
COPY . .

ENV NODE_ENV=production

# Build the app (fails fast if broken)
RUN npm run build

# ------------------------------------------------
# 🚀 Production image
FROM node:18-alpine AS production

# Install minimal packages for runtime
RUN apk add --no-cache curl

WORKDIR /app

# Copy only what's needed
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built output and necessary shared folders
COPY --from=base /app/dist ./dist
COPY --from=base /app/shared ./shared

# 🛡️ Optional: drizzle might not exist yet (so we add a fallback)
COPY --from=base /app/drizzle ./drizzle 2>/dev/null || true

# 👤 Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

# 📡 App listens on this port
EXPOSE 5000

# 🔍 Basic healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# 🏁 Start the app
CMD ["node", "dist/index.js"]
