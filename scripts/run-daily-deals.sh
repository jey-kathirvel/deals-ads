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
  --max-time 900 \
  --request POST \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  https://deals.ads-ai.in/api/cron/quickcommerce-daily
