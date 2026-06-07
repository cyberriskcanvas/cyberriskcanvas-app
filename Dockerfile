ARG NODE_VERSION=26-alpine
ARG TARGETPLATFORM=linux/amd64

# ── Stage 1: Production dependencies only (for runner) ───────────────────────
FROM node:${NODE_VERSION} AS dependencies
LABEL org.opencontainers.image.source="https://github.com/cyberriskcanvas/cyberriskcanvas-app"
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm install -g yarn@1.22.22

COPY package.json yarn.lock ./
RUN yarn install --prod --frozen-lockfile

# ── Stage 2: Build Next.js (all deps needed for CSS/TS compilation) ───────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm install -g yarn@1.22.22

# Suppress Prisma connection attempts during build (no DB available).
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

COPY package.json yarn.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN yarn install
COPY . .
RUN yarn prisma:generate
RUN yarn build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache openssl
RUN npm install -g yarn@1.22.22

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src/generated ./src/generated
COPY --chown=node:node public ./public
COPY --chown=node:node server-prelude.cjs ./server-prelude.cjs
COPY --chown=node:node server.ts ./server.ts
COPY --chown=node:node tsconfig.json ./tsconfig.json
COPY --chown=node:node src/websocket ./src/websocket
COPY --chown=node:node src/lib ./src/lib
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./

USER node
EXPOSE 3000

# On startup: run DB migrations, then start the app.
# The app server bootstraps the first admin user automatically (via ADMIN_EMAIL + ADMIN_PASSWORD).
CMD ["sh", "-c", "yarn prisma:migrate-deploy && yarn start"]
