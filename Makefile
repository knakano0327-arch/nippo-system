.PHONY: dev lint lint-fix format format-check test test-coverage test-e2e build deploy-preview deploy-prod

# --------------------------------------------------------------------------
# 開発
# --------------------------------------------------------------------------

dev:
	npm run dev

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

format-check:
	npm run format:check

test:
	npm run test

test-coverage:
	npm run test:coverage

test-e2e:
	npm run test:e2e

build:
	npm run build

# --------------------------------------------------------------------------
# Vercel デプロイ（VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID が必要）
# --------------------------------------------------------------------------

deploy-preview:
	vercel pull --yes --environment=preview --token=$(VERCEL_TOKEN)
	vercel build --token=$(VERCEL_TOKEN)
	vercel deploy --prebuilt --token=$(VERCEL_TOKEN)

deploy-prod:
	vercel pull --yes --environment=production --token=$(VERCEL_TOKEN)
	vercel build --prod --token=$(VERCEL_TOKEN)
	vercel deploy --prebuilt --prod --token=$(VERCEL_TOKEN)
