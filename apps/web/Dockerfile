# base image
FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install --workspaces
COPY . .

WORKDIR /app/apps/web
RUN npm run build

# final image
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/apps/web/.next ./.next
COPY --from=base /app/apps/web/package.json ./package.json
COPY --from=base /app/apps/web/public ./public
COPY --from=base /app/apps/web/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
