#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
ADMIN_USERNAME="${UAT_ADMIN_USERNAME:-}"
ADMIN_PASSWORD="${UAT_ADMIN_PASSWORD:-}"

COOKIE_JAR="$(mktemp)"
RESPONSE_FILE="$(mktemp)"

cleanup() {
  rm -f "$COOKIE_JAR" "$RESPONSE_FILE"
}

trap cleanup EXIT

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [ "$actual" != "$expected" ]; then
    echo "$label: FAILED"
    echo "EXPECTED_HTTP=$expected"
    echo "ACTUAL_HTTP=$actual"
    cat "$RESPONSE_FILE"
    exit 1
  fi

  echo "$label: PASSED [$actual]"
}

assert_json_success() {
  python3 - "$RESPONSE_FILE" <<'PY'
import json
import sys

path = sys.argv[1]

with open(path, encoding="utf-8") as handle:
    payload = json.load(handle)

if payload.get("success") is not True:
    raise SystemExit(
        "Expected success=true. Response: "
        + json.dumps(payload, indent=2)
    )
PY
}

echo "===== ADMIN JOBS UAT ====="
echo "BASE_URL=$BASE_URL"

echo
echo "===== UAT-001 UNAUTHORIZED CURRENT ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/current"
)"

assert_status "$HTTP_CODE" "401" "UAT-001"

echo
echo "===== UAT-002 UNAUTHORIZED HISTORY ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/history"
)"

assert_status "$HTTP_CODE" "401" "UAT-002"

echo
echo "===== UAT-003 UNAUTHORIZED RUN ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --request POST \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/run"
)"

assert_status "$HTTP_CODE" "401" "UAT-003"

echo
echo "===== UAT-004 UNAUTHORIZED RETRY ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --request POST \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/retry"
)"

assert_status "$HTTP_CODE" "401" "UAT-004"

if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo
  echo "UAT ADMIN CREDENTIALS MISSING"
  echo
  echo "Run authenticated UAT using:"
  echo
  echo "UAT_ADMIN_USERNAME='tech@ads-ai.in' \\"
  echo "UAT_ADMIN_PASSWORD='YOUR_PASSWORD' \\"
  echo "BASE_URL='$BASE_URL' \\"
  echo "bash scripts/uat-admin-jobs.sh"
  echo
  echo "PATCH-003.5A.2 UNAUTHORIZED UAT: PASSED"
  exit 0
fi

echo
echo "===== UAT-005 ADMIN LOGIN ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie-jar "$COOKIE_JAR" \
    --header 'Content-Type: application/json' \
    --request POST \
    --data "$(
      ADMIN_USERNAME="$ADMIN_USERNAME" \
      ADMIN_PASSWORD="$ADMIN_PASSWORD" \
      python3 <<'PY'
import json
import os

print(
    json.dumps(
        {
            "username": os.environ["ADMIN_USERNAME"],
            "password": os.environ["ADMIN_PASSWORD"],
        }
    )
)
PY
    )" \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/login"
)"

assert_status "$HTTP_CODE" "200" "UAT-005"
assert_json_success

if ! grep -q 'deals_admin_session' "$COOKIE_JAR"; then
  echo "UAT-005: FAILED"
  echo "Admin session cookie not returned."
  cat "$RESPONSE_FILE"
  exit 1
fi

echo "SESSION_COOKIE: PASSED"

echo
echo "===== UAT-006 AUTHORIZED CURRENT ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie "$COOKIE_JAR" \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/current"
)"

assert_status "$HTTP_CODE" "200" "UAT-006"

python3 - "$RESPONSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

if "lock" not in payload:
    raise SystemExit("Current-job response is missing lock.")

if "current" not in payload:
    raise SystemExit("Current-job response is missing current.")
PY

echo "CURRENT_RESPONSE_SCHEMA: PASSED"

echo
echo "===== UAT-007 AUTHORIZED HISTORY ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie "$COOKIE_JAR" \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/history"
)"

assert_status "$HTTP_CODE" "200" "UAT-007"

python3 - "$RESPONSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

if not isinstance(payload, list):
    raise SystemExit("Job-history response must be an array.")
PY

echo "HISTORY_RESPONSE_SCHEMA: PASSED"

echo
echo "===== UAT-008 RUN JOB ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie "$COOKIE_JAR" \
    --header 'Content-Type: application/json' \
    --request POST \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/run"
)"

assert_status "$HTTP_CODE" "200" "UAT-008"
assert_json_success

JOB_ID="$(
  python3 - "$RESPONSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

job_id = payload.get("jobId")

if not job_id:
    raise SystemExit("Run-job response is missing jobId.")

print(job_id)
PY
)"

echo "RUN_JOB_ID=$JOB_ID"

echo
echo "===== UAT-009 VERIFY COMPLETED JOB ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie "$COOKIE_JAR" \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/current"
)"

assert_status "$HTTP_CODE" "200" "UAT-009"

python3 - "$RESPONSE_FILE" "$JOB_ID" <<'PY'
import json
import sys

path = sys.argv[1]
expected_job_id = sys.argv[2]

with open(path, encoding="utf-8") as handle:
    payload = json.load(handle)

current = payload.get("current")
lock = payload.get("lock", {})

if not current:
    raise SystemExit("Completed job is not available.")

if current.get("id") != expected_job_id:
    raise SystemExit(
        f"Expected job {expected_job_id}, "
        f"received {current.get('id')}."
    )

if current.get("status") != "success":
    raise SystemExit(
        f"Expected success status, "
        f"received {current.get('status')}."
    )

if current.get("progress") != 100:
    raise SystemExit(
        f"Expected progress 100, "
        f"received {current.get('progress')}."
    )

if lock.get("locked") is not False:
    raise SystemExit("Job lock was not released.")
PY

echo "COMPLETED_JOB_VALIDATION: PASSED"

echo
echo "===== UAT-010 VERIFY HISTORY ENTRY ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie "$COOKIE_JAR" \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/history"
)"

assert_status "$HTTP_CODE" "200" "UAT-010"

python3 - "$RESPONSE_FILE" "$JOB_ID" <<'PY'
import json
import sys

path = sys.argv[1]
expected_job_id = sys.argv[2]

with open(path, encoding="utf-8") as handle:
    history = json.load(handle)

matches = [
    job
    for job in history
    if job.get("id") == expected_job_id
]

if len(matches) != 1:
    raise SystemExit(
        f"Expected one history record for {expected_job_id}, "
        f"found {len(matches)}."
    )

job = matches[0]

if job.get("status") != "success":
    raise SystemExit("History job did not complete successfully.")

if job.get("imported") != 94:
    raise SystemExit(
        f"Expected imported=94, received {job.get('imported')}."
    )

if job.get("updated") != 4:
    raise SystemExit(
        f"Expected updated=4, received {job.get('updated')}."
    )

if job.get("skipped") != 2:
    raise SystemExit(
        f"Expected skipped=2, received {job.get('skipped')}."
    )
PY

echo "HISTORY_ENTRY_VALIDATION: PASSED"

echo
echo "===== UAT-011 RETRY VALIDATION ====="

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --cookie "$COOKIE_JAR" \
    --header 'Content-Type: application/json' \
    --request POST \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    "$BASE_URL/api/admin/jobs/retry"
)"

assert_status "$HTTP_CODE" "400" "UAT-011"

python3 - "$RESPONSE_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

if payload.get("success") is not False:
    raise SystemExit("Retry validation must return success=false.")

message = str(payload.get("message", "")).lower()

if "no failed job" not in message:
    raise SystemExit(
        "Retry validation did not return the expected message."
    )
PY

echo "RETRY_GUARD_VALIDATION: PASSED"

echo
echo "========================================"
echo "PATCH-003.5A.2 ADMIN JOBS UAT: PASSED"
echo "========================================"
