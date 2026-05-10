#!/bin/bash
# Vercel production build script
# Switches the Prisma schema provider to PostgreSQL when DATABASE_URL is a PostgreSQL URL,
# then generates the client, applies the schema, and builds Next.js.
set -e

echo "Starting Vercel production build..."

if [[ "${DATABASE_URL}" == postgresql://* ]] || [[ "${DATABASE_URL}" == postgres://* ]]; then
  echo "PostgreSQL detected — switching schema provider..."

  # Replace only the provider line in-place.
  # - perl is used instead of sed for portability: GNU sed (Linux) and BSD sed (macOS)
  #   handle \n in replacement strings differently, but perl -pe behaves consistently
  #   on both platforms.
  # - The URL is intentionally NOT added here; prisma.config.ts already supplies it
  #   via `datasource.url = process.env["DATABASE_URL"]`, which takes precedence.
  perl -i -pe 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

  echo "Generating Prisma client..."
  npx prisma generate

  # `prisma migrate deploy` requires migration files written for the target database
  # dialect. The existing files under prisma/migrations/ use SQLite PRAGMA syntax and
  # cannot run against PostgreSQL.
  #
  # `prisma db push` is used instead: it derives the schema from prisma/schema.prisma
  # directly without executing migration files, making it safe for initial deployment
  # on a fresh database.
  #
  # WARNING: --accept-data-loss allows destructive schema changes (column drops,
  # table recreations) without confirmation. This is intentional for first-time
  # deployments against an empty database. Once the database contains production data,
  # switch to PostgreSQL-native migrations instead:
  #   1. Generate: DATABASE_URL=<postgres-url> npx prisma migrate dev --name <desc>
  #   2. Commit the generated migration file.
  #   3. Replace `prisma db push --accept-data-loss` with `prisma migrate deploy`.
  echo "Applying schema to database..."
  npx prisma db push --accept-data-loss

else
  # Non-PostgreSQL path: used when running this script locally against a SQLite database,
  # or in any environment where DATABASE_URL begins with "file:".
  # Vercel production always uses a PostgreSQL URL and will not reach this branch.
  echo "Generating Prisma client..."
  npx prisma generate

  echo "Applying database migrations..."
  npx prisma migrate deploy
fi

echo "Building Next.js application..."
npx next build

echo "Build complete."
