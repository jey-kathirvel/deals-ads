#!/bin/sh
set -eu

cd /opt/deals-ads
set -a
. ./.env
set +a

curl \
  --fail \
  --silent \
  --show-error \
  --max-time 300 \
  --request POST \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  https://deals.ads-ai.in/api/cron/deals-cleanup
