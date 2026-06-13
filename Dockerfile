# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Toolchain for compiling better-sqlite3's native bindings if no prebuild matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# SQLite DB + uploaded covers live here — mount a volume at /app/data.
ENV DATABASE_URL=/app/data/buecherwurm.db

# Bring over the fully built app (incl. node_modules with the compiled
# better-sqlite3 binary, .next, drizzle migrations, seed + config). Keeping the
# dev deps lets the entrypoint reuse drizzle-kit (migrate) and tsx (seed).
COPY --from=build /app ./

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
