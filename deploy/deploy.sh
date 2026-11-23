#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?usage: deploy.sh <staging|production> <image-tag>}"
NEW_TAG="${2:?usage: deploy.sh <staging|production> <image-tag>}"
case "$ENVIRONMENT" in staging | production) ;; *) echo "unknown environment: $ENVIRONMENT" >&2; exit 2 ;; esac

DIR="/opt/bustravel/${ENVIRONMENT}"
cd "$DIR"

set -a; . ./.env; set +a          # IMAGE_PREFIX, DOMAIN, POSTGRES_PASSWORD, ...
export TAG="$NEW_TAG"
COMPOSE=(docker compose -p "bt-${ENVIRONMENT}" --env-file .env -f docker-compose.server.yml)
PREVIOUS_TAG="$(cat .current_tag 2>/dev/null || true)"

wait_healthy() {
  for i in $(seq 1 24); do
    if curl -fsS --max-time 5 "https://${DOMAIN}/api/health" | grep -q '"status":"ok"'; then return 0; fi
    sleep 5
  done
  return 1
}

echo "==> [$ENVIRONMENT] deploying tag ${NEW_TAG} (previous: ${PREVIOUS_TAG:-none})"
"${COMPOSE[@]}" pull
mkdir -p backups
"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" exec -T db pg_dump -U bustravel bustravel | gzip > "backups/pre-${NEW_TAG}-$(date +%Y%m%d%H%M%S).sql.gz"

"${COMPOSE[@]}" up -d --remove-orphans

if wait_healthy; then
  echo "$NEW_TAG" > .current_tag
  docker image prune -f >/dev/null
  echo "==> [$ENVIRONMENT] ${NEW_TAG} is healthy"
  exit 0
fi

echo "!! [$ENVIRONMENT] ${NEW_TAG} failed its health check" >&2
"${COMPOSE[@]}" logs --tail=60 api web >&2 || true
if [ -n "$PREVIOUS_TAG" ]; then
  echo "==> rolling back to ${PREVIOUS_TAG}" >&2
  export TAG="$PREVIOUS_TAG"
  "${COMPOSE[@]}" up -d --remove-orphans
  wait_healthy && echo "==> rollback to ${PREVIOUS_TAG} succeeded" >&2
fi
exit 1
