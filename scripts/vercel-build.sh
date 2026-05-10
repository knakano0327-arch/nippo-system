#!/bin/bash
# Vercel production build script
# Switches the Prisma schema provider to PostgreSQL when DATABASE_URL is a PostgreSQL URL,
# then generates the client, applies the schema, and builds Next.js.
set -e

echo "Starting Vercel production build..."

if [[ "${DATABASE_URL}" == postgresql://* ]] || [[ "${DATABASE_URL}" == postgres://* ]]; then
  echo "PostgreSQL detected — switching schema provider..."
  # Replace the provider line in-place (Vercel runs in an ephemeral container so this is safe)
  sed -i 's/provider = "sqlite"/provider = "postgresql"\n  url      = env("DATABASE_URL")/' prisma/schema.prisma

  echo "Generating Prisma client..."
  npx prisma generate

  # prisma migrate deploy requires migration files written for the target database dialect.
  # The existing migrations under prisma/migrations/ were generated for SQLite (PRAGMA syntax)
  # and cannot run against PostgreSQL.
  #
  # For the initial deployment, use `prisma db push` which applies the schema directly
  # without executing migration files.  For subsequent schema changes, generate
  # PostgreSQL-native migrations with:
  #   DATABASE_URL=<postgres-url> npx prisma migrate dev --name <description>
  # and commit the resulting migration file alongside the schema change.
  echo "Applying schema to database..."
  npx prisma db push --accept-data-loss

else
  echo "Generating Prisma client..."
  npx prisma generate

  echo "Applying database migrations..."
  npx prisma migrate deploy
fi

echo "Building Next.js application..."
npx next build

echo "Build complete."
