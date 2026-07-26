#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/opt/deals-ads"
COMPOSE_SERVICE="deals"
ENDPOINT="http://127.0.0.1:8089/api/cron/grocery-deals"
LOG_FILE="${PROJECT_DIR}/data/grocery-daily-job.log"
LOCK_FILE="/tmp/deals-ads-grocery-daily.lock"

mkdir -p "${PROJECT_DIR}/data"

exec 9>"${LOCK_FILE}"

if ! flock -n 9; then
  printf '%s %s\n' \
    "$(date --iso-8601=seconds)" \
    "Grocery job skipped: another run is active." \
    >> "${LOG_FILE}"
  exit 0
fi

cd "${PROJECT_DIR}"

SECRET="$(
  docker compose exec -T "${COMPOSE_SERVICE}" \
    sh -lc 'printf "%s" "$CRON_SECRET"'
)"

if [ -z "${SECRET}" ]; then
  printf '%s %s\n' \
    "$(date --iso-8601=seconds)" \
    "Grocery job failed: CRON_SECRET is empty." \
    >> "${LOG_FILE}"
  exit 1
fi

printf '%s %s\n' \
  "$(date --iso-8601=seconds)" \
  "Starting isolated Grocery daily job." \
  >> "${LOG_FILE}"

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --output /tmp/deals-ads-grocery-response.json \
    --write-out "%{http_code}" \
    --max-time 1800 \
    --request POST \
    --header "Authorization: Bearer ${SECRET}" \
    "${ENDPOINT}"
)"

cat /tmp/deals-ads-grocery-response.json >> "${LOG_FILE}"
printf '\n' >> "${LOG_FILE}"

if [ "${HTTP_CODE}" != "200" ]; then
  printf '%s HTTP %s\n' \
    "$(date --iso-8601=seconds)" \
    "${HTTP_CODE}" \
    >> "${LOG_FILE}"
  exit 1
fi

printf '%s %s\n' \
  "$(date --iso-8601=seconds)" \
  "Isolated Grocery daily job completed." \
  >> "${LOG_FILE}"
