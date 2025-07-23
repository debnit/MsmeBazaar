# Use official Node.js image as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Install dependencies for all workspaces
RUN npm install --workspaces

# Copy full monorepo for build context
COPY . .

# Build the web app
WORKDIR /app/apps/web
RUN npm run build

# Start with next start
EXPOSE 3000
CMD ["npm", "start"]
