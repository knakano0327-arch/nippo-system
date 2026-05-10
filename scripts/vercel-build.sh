#!/bin/bash
# Vercel production build script
# Handles PostgreSQL schema switching when DATABASE_URL is a PostgreSQL URL.
set -e

echo "Starting Vercel production build..."

# Detect database type from DATABASE_URL
if [[ "${DATABASE_URL}" == postgresql://* ]] || [[ "${DATABASE_URL}" == postgres://* ]]; then
  echo "PostgreSQL detected — switching Prisma schema to PostgreSQL..."
  cp prisma/schema.prisma prisma/schema.sqlite.bak
  cp prisma/schema.postgresql.prisma prisma/schema.prisma
  SWITCHED_SCHEMA=true
fi

echo "Generating Prisma client..."
npx prisma generate

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Building Next.js application..."
npx next build

# Restore SQLite schema so local dev isn't affected if running in a non-ephemeral env
if [[ "${SWITCHED_SCHEMA}" == "true" ]]; then
  mv prisma/schema.sqlite.bak prisma/schema.prisma
fi

echo "Build complete."
