# Multi-stage Docker build for MSMESquare
FROM node:18-alpine AS base

# Install dependencies for building
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files and install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=base --chown=nextjs:nodejs /app/dist ./dist

# Copy database migration files if they exist
COPY --from=base --chown=nextjs:nodejs /app/drizzle ./drizzle 2>/dev/null || true
COPY --from=base --chown=nextjs:nodejs /app/shared ./shared

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]