#!/bin/sh
set -e

echo "▶ Applying database migrations…"
npm run db:migrate

# Idempotent: creates the seed owner only if it doesn't exist yet.
echo "▶ Seeding (idempotent)…"
npm run db:seed

echo "▶ Starting Bücherwurm on port ${PORT:-3000}…"
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
