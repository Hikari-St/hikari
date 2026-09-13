# Dockerfile for Hikari / Hakiru Protocol Production Services
# Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat dumb-init

# Copy root package definitions
COPY package*.json ./
COPY engine/package*.json ./engine/
COPY agents/package*.json ./agents/
COPY sdk/package*.json ./sdk/
COPY services/x402-gateway/package*.json ./services/x402-gateway/
COPY services/database/package*.json ./services/database/
COPY services/social-bot/package*.json ./services/social-bot/
COPY services/automation/package*.json ./services/automation/

# Install dependencies across all workspaces
RUN npm install
RUN npm install --prefix engine
RUN npm install --prefix agents
RUN npm install --prefix sdk
RUN npm install --prefix services/x402-gateway
RUN npm install --prefix services/database
RUN npm install --prefix services/social-bot
RUN npm install --prefix services/automation

# Copy full source trees
COPY engine/ ./engine/
COPY agents/ ./agents/
COPY sdk/ ./sdk/
COPY services/ ./services/
COPY frontend/ ./frontend/
COPY deployed_contracts.json ./
COPY deployed_mainnet.json ./
COPY docs/ ./docs/

# Build TypeScript packages
RUN npm run build --prefix engine
RUN npm install --prefix agents
RUN npm run build --prefix agents
RUN npm run build --prefix sdk
RUN npm run build --prefix services/x402-gateway
RUN npm run build:services

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

# Create non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hikari

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and runtime files from base
COPY --from=base --chown=hikari:nodejs /app /app

USER hikari

EXPOSE 3000 3402

# Secure dumb-init process manager
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "frontend/server.js"]
