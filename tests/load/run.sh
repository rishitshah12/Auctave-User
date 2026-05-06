#!/usr/bin/env bash
# ─── Garment ERP Load Test Runner ────────────────────────────────────────────
# Usage:
#   ./tests/load/run.sh smoke     →  5 VUs, 1 min
#   ./tests/load/run.sh load      →  0→30 VUs, 14 min
#   ./tests/load/run.sh stress    →  0→200 VUs, 13 min
#   ./tests/load/run.sh 100k      →  0→100 VUs via k6 Cloud (needs k6 login)
#
# Tokens required in .env.test:
#   TEST_USER_TOKEN / TEST_USER_REFRESH  — regular user (auto-refreshed)
#   TEST_ADMIN_TOKEN / TEST_ADMIN_REFRESH — admin user (auto-refreshed)

set -e

SCENARIO="${1:-smoke}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# ── Read credentials from project env files ────────────────────────────────
SUPABASE_URL=$(grep 'VITE_SUPABASE_URL='      "$ROOT/.env.local" | cut -d= -f2- | tr -d '\r\n')
ANON_KEY=$(grep    'VITE_SUPABASE_ANON_KEY='  "$ROOT/.env.local" | cut -d= -f2- | tr -d '\r\n')
USER_TOKEN=$(grep  'TEST_USER_TOKEN='         "$ROOT/.env.test"  | cut -d= -f2- | tr -d '\r\n')
ADMIN_TOKEN=$(grep 'TEST_ADMIN_TOKEN='        "$ROOT/.env.test"  | cut -d= -f2- | tr -d '\r\n')

# ── Validate ──────────────────────────────────────────────────────────────────
if [ -z "$SUPABASE_URL" ]; then echo "❌  VITE_SUPABASE_URL missing from .env.local"; exit 1; fi
if [ -z "$ANON_KEY" ];     then echo "❌  VITE_SUPABASE_ANON_KEY missing from .env.local"; exit 1; fi

# Helper: refresh a token and write back to .env.test only if successful
# Usage: refresh_token <label> <refresh_token_value> <token_key> <refresh_key>
# Sets global NEW_ACCESS and NEW_REFRESH on success, leaves originals untouched on failure
refresh_token() {
  local LABEL="$1"
  local REFRESH_VAL="$2"
  local TOKEN_KEY="$3"
  local REFRESH_KEY="$4"

  echo " 🔄  Refreshing ${LABEL} token…"
  local RESP
  RESP=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"refresh_token\": \"${REFRESH_VAL}\"}")

  local NEW_ACCESS NEW_REFRESH
  NEW_ACCESS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  NEW_REFRESH=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('refresh_token',''))" 2>/dev/null || true)

  if [ -n "$NEW_ACCESS" ] && [ -n "$NEW_REFRESH" ]; then
    sed -i '' "s|^${TOKEN_KEY}=.*|${TOKEN_KEY}=${NEW_ACCESS}|"   "$ROOT/.env.test"
    sed -i '' "s|^${REFRESH_KEY}=.*|${REFRESH_KEY}=${NEW_REFRESH}|" "$ROOT/.env.test"
    echo "$NEW_ACCESS"   # return value via stdout
    echo " ✅  ${LABEL} token refreshed (valid 1 hour)" >&2
  else
    echo "" # return empty on failure
    echo " ⚠️   ${LABEL} token refresh failed — using existing token" >&2
  fi
}

# ── Auto-refresh user token ────────────────────────────────────────────────
USER_REFRESH=$(grep 'TEST_USER_REFRESH=' "$ROOT/.env.test" | cut -d= -f2- | tr -d '\r\n')
if [ -n "$USER_REFRESH" ]; then
  REFRESHED=$(refresh_token "user" "$USER_REFRESH" "TEST_USER_TOKEN" "TEST_USER_REFRESH")
  [ -n "$REFRESHED" ] && USER_TOKEN="$REFRESHED"
fi

# ── Auto-refresh admin token ───────────────────────────────────────────────
ADMIN_REFRESH=$(grep 'TEST_ADMIN_REFRESH=' "$ROOT/.env.test" | cut -d= -f2- | tr -d '\r\n')
if [ -n "$ADMIN_REFRESH" ]; then
  REFRESHED=$(refresh_token "admin" "$ADMIN_REFRESH" "TEST_ADMIN_TOKEN" "TEST_ADMIN_REFRESH")
  [ -n "$REFRESHED" ] && ADMIN_TOKEN="$REFRESHED"
fi

if [ -z "$USER_TOKEN" ];  then echo "❌  TEST_USER_TOKEN missing from .env.test — add it or provide TEST_USER_REFRESH"; exit 1; fi
if [ -z "$ADMIN_TOKEN" ]; then echo "⚠️   TEST_ADMIN_TOKEN missing — admin/analytics load scenarios will be skipped"; fi

echo "────────────────────────────────────────────────────"
echo " Garment ERP Load Test Runner"
echo "────────────────────────────────────────────────────"
echo " Scenario:     $SCENARIO"
echo " Supabase:     $SUPABASE_URL"
echo " User token:   ✓ provided (${#USER_TOKEN} chars)"
echo " Admin token:  ${ADMIN_TOKEN:+✓ provided (${#ADMIN_TOKEN} chars)}${ADMIN_TOKEN:-✗ missing}"
echo "────────────────────────────────────────────────────"

# ── Run ───────────────────────────────────────────────────────────────────────
COMMON_ENV="--env SUPABASE_URL=$SUPABASE_URL --env SUPABASE_ANON_KEY=$ANON_KEY --env USER_TOKEN=$USER_TOKEN --env ADMIN_TOKEN=$ADMIN_TOKEN"
SCRIPT="$ROOT/tests/load/load.test.js"

case "$SCENARIO" in
  smoke)  k6 run $COMMON_ENV --env SCENARIO=smoke "$SCRIPT" ;;
  load)   k6 run $COMMON_ENV --env SCENARIO=load  "$SCRIPT" ;;
  stress) k6 run $COMMON_ENV --env SCENARIO=stress "$SCRIPT" ;;
  100k)
    echo ""
    echo " ⚠️   scale100k requires k6 Cloud (https://grafana.com/products/cloud/k6/)"
    echo "      Login first: k6 login cloud --token YOUR_TOKEN"
    echo "      Then:        ./tests/load/run.sh 100k"
    echo "      Do NOT run k6 cloud directly — this script auto-refreshes both tokens."
    echo ""
    k6 cloud run $COMMON_ENV --env SCENARIO=scale100k "$SCRIPT"
    ;;
  *)
    echo "❌  Unknown scenario: $SCENARIO  (use: smoke | load | stress | 100k)"
    exit 1
    ;;
esac
