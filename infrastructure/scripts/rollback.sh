#!/usr/bin/env sh
set -eu

COMPOSE_FILE="infrastructure/docker/docker-compose.prod.yml"

docker compose -f "$COMPOSE_FILE" down
