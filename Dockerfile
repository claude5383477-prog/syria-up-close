# syntax=docker/dockerfile:1
# Production image (T33). The build needs no database (BUILD_WITHOUT_DB, see src/lib/build-phase.ts);
# on boot the container runs `payload migrate`, starts the Next standalone server, then refreshes
# every public page from the database (scripts/docker/start.mjs).
#
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://example.org -t syria-up-close .

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# All dependencies, for the build.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Production dependencies only: migrations and the seed run from source (payload ships tsx).
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are compiled into the bundles, so the public URL is fixed per image.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN test -n "$NEXT_PUBLIC_SITE_URL" || { echo "build arg NEXT_PUBLIC_SITE_URL is required" >&2; exit 1; }
# The secret and database URL here are placeholders: nothing connects during this build, and the
# real values come from the runtime environment.
RUN BUILD_WITHOUT_DB=1 PAYLOAD_SECRET=build-only-placeholder DATABASE_URL=postgres://build@127.0.0.1:1/none \
    node node_modules/next/dist/bin/next build --webpack

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/data/media
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
COPY scripts/revalidate.mjs ./scripts/revalidate.mjs
COPY scripts/docker ./scripts/docker
COPY --from=build /app/.next/standalone ./server
COPY --from=build /app/.next/static ./server/.next/static
COPY --from=build /app/public ./server/public
# Uploaded photos live on a volume; the server writes ISR pages under server/.next.
RUN mkdir -p /data/media && chown -R node:node /data /app/server/.next
USER node
VOLUME /data/media
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "scripts/docker/start.mjs"]
