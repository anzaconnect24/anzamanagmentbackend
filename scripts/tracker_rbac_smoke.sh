#!/usr/bin/env bash
set -euo pipefail

# Usage:
# BASE_URL=http://localhost:5000 \
# ADMIN_TOKEN="..." MENTOR_TOKEN="..." ENTREPRENEUR_TOKEN="..." \
# MENTOR_UUID="..." ENTREPRENEUR_UUID="..." MILESTONE_UUID="..." \
# bash scripts/tracker_rbac_smoke.sh

BASE_URL="${BASE_URL:-http://localhost:5000}"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

require_var ADMIN_TOKEN
require_var MENTOR_TOKEN
require_var ENTREPRENEUR_TOKEN
require_var MENTOR_UUID
require_var ENTREPRENEUR_UUID

echo "[1/8] Admin can view tracker overview"
curl -s -o /tmp/admin_overview.json -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/tracker/admin/overview" | grep -q "200"

echo "[2/8] Mentor denied admin overview"
curl -s -o /tmp/mentor_admin_overview.json -w "%{http_code}" \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  "$BASE_URL/tracker/admin/overview" | grep -q "403"

echo "[3/8] Entrepreneur denied mentor weekly logs"
curl -s -o /tmp/entrepreneur_weekly_logs.json -w "%{http_code}" \
  -H "Authorization: Bearer $ENTREPRENEUR_TOKEN" \
  "$BASE_URL/tracker/mentor/weekly-logs" | grep -q "403"

echo "[4/8] Mentor can view own mentor reports"
curl -s -o /tmp/mentor_reports_self.json -w "%{http_code}" \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  "$BASE_URL/mentor-reports/mentor/$MENTOR_UUID" | grep -q "200"

echo "[5/8] Entrepreneur denied reading mentor reports by mentor UUID"
curl -s -o /tmp/entrepreneur_mentor_reports.json -w "%{http_code}" \
  -H "Authorization: Bearer $ENTREPRENEUR_TOKEN" \
  "$BASE_URL/mentor-reports/mentor/$MENTOR_UUID" | grep -q "403"

echo "[6/8] Entrepreneur can read own reports"
curl -s -o /tmp/entrepreneur_reports_self.json -w "%{http_code}" \
  -H "Authorization: Bearer $ENTREPRENEUR_TOKEN" \
  "$BASE_URL/mentor-reports/entreprenuer/$ENTREPRENEUR_UUID" | grep -q "200"

echo "[7/8] Mentor denied assigning entrepreneur directly"
curl -s -o /tmp/mentor_assign_attempt.json -w "%{http_code}" \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mentor_uuid":"'$MENTOR_UUID'","entreprenuer_uuid":"'$ENTREPRENEUR_UUID'"}' \
  "$BASE_URL/mentor-entreprenuers/" | grep -q "403"

if [[ -n "${MILESTONE_UUID:-}" ]]; then
  echo "[8/8] Mentor can review a milestone"
  curl -s -o /tmp/mentor_review_milestone.json -w "%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer $MENTOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"in_progress","mentorReviewNotes":"Smoke test"}' \
    "$BASE_URL/tracker/milestones/$MILESTONE_UUID/review" | grep -Eq "200|404"
else
  echo "[8/8] Skipped milestone review check (MILESTONE_UUID not provided)"
fi

echo "Tracker RBAC smoke checks passed."
