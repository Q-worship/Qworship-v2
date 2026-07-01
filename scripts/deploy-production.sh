#!/usr/bin/env bash
# Production redeploy for app.qworship.com (Coolify / VPS with Docker Compose).
# Run on the host where app.qworship.com is served (204.168.139.179).
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO_DIR"

if [[ ! -f docker-compose.yaml ]]; then
  echo "error: docker-compose.yaml not found in $REPO_DIR" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "warning: .env missing — copy production.env.example to .env and fill secrets before continuing" >&2
fi

echo "==> Pull latest main"
git fetch origin main
git checkout main
git pull origin main

echo "==> Rebuild marketing + gateway (client service) + product + server"
docker compose down
docker compose build --no-cache marketing client product server
docker compose up -d --build

echo "==> Smoke checks"
sleep 5
curl -sf "http://127.0.0.1:3000/" | head -c 300 || true
echo ""
curl -sI "http://127.0.0.1:3000/signin" | head -5 || true

echo ""
echo "Done. Verify from outside:"
echo "  curl -sf https://app.qworship.com/ | grep -i marketing-assets"
echo "  curl -sI https://app.qworship.com/signin | grep -i location"
