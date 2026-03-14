#!/usr/bin/env sh
set -eu

ENVIRONMENT="${1:-staging}"
COMPOSE_FILE="infrastructure/docker/docker-compose.prod.yml"

if [ "$ENVIRONMENT" = "staging" ]; then
  export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost}"
fi

if [ "$ENVIRONMENT" = "production" ]; then
  export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost}"
fi

# Pull latest base images when available
docker compose -f "$COMPOSE_FILE" pull || true

# Rebuild and start with latest code
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

# Quick cleanup
docker image prune -f || true

# Show running services
docker compose -f "$COMPOSE_FILE" ps
