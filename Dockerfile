# Base build image
FROM node:18-alpine AS base

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies for build (incl. devDeps)
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

# Runtime image
FROM node:18-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=base /app/dist ./dist
COPY --from=base /app/shared ./shared
COPY --from=base /app/drizzle ./drizzle

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
