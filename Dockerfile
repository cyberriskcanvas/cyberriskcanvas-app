ARG NODE_VERSION=26-alpine
ARG TARGETPLATFORM=linux/amd64

# ── Stage 1: Production dependencies only (for runner) ───────────────────────
FROM node:${NODE_VERSION} AS dependencies
LABEL org.opencontainers.image.source="https://github.com/cyberriskcanvas/cyberriskcanvas-app"
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat && \
    npm install -g yarn && \
    npm cache clean --force

COPY package.json yarn.lock ./
RUN yarn install --prod --frozen-lockfile --ignore-scripts && \
    yarn cache clean && \
    rm -rf /root/.cache /tmp/*

# ── Stage 2: Build Next.js (all deps needed for CSS/TS compilation) ───────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat && \
    npm install -g yarn && \
    npm cache clean --force

# Suppress Prisma connection attempts during build (no DB available).
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma:generate
RUN yarn build

# The custom server (server.ts and everything it imports) as one minified file, so the image carries no sources
RUN node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --target=node22 \
      --packages=external --minify --legal-comments=none --outfile=dist/server.mjs

# Build cache (GBs) and source maps (they embed the original sources) stay out of the runner image
RUN rm -rf .next/cache && find .next -name '*.map' -delete

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat && \
    npm install -g yarn && \
    npm cache clean --force

# Pre-create data dirs owned by the runtime user so fresh named volumes are writable
RUN mkdir -p /data/documents /data/evidence && chown -R node:node /data

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node public ./public
COPY --chown=node:node server-prelude.cjs ./server-prelude.cjs
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./

USER node
EXPOSE 3000

# On startup: run DB migrations, then start the app.
# The app server bootstraps the first admin user automatically (via ADMIN_EMAIL + ADMIN_PASSWORD).
# tsx only as loader: it resolves the extensionless imports inside next-auth; there is no TypeScript left to compile.
CMD ["sh", "-c", "yarn prisma:migrate-deploy && node --require ./server-prelude.cjs --import tsx dist/server.mjs"]
