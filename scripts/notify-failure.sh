#!/bin/bash
# Best-effort failure notification for the scheduled dopamine jobs. NEVER fails
# the caller (always exits 0). Three channels:
#   1. Appends to logs/piggyback-failures.log (durable, greppable — always).
#   2. macOS desktop notification via osascript (best-effort; launchd may suppress).
#   3. If PIGGYBACK_ALERT_WEBHOOK is set in .env, POSTs a Slack-compatible
#      {"text": ...} payload (reliable even when away from the machine).
#
# Usage: bash scripts/notify-failure.sh "message"
set -uo pipefail

# Sanitise: drop quotes/backslashes (protect the osascript + JSON strings) and newlines.
MSG="$(printf '%s' "${1:-dopamine scheduled job failed}" | tr -d '"\\' | tr '\n' ' ')"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"

# 1. Durable log
mkdir -p "$DIR/logs"
echo "[$TS] $MSG" >> "$DIR/logs/piggyback-failures.log"

# 2. macOS desktop notification (best-effort)
if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"$MSG\" with title \"Dopamine\" subtitle \"scheduled job failed\" sound name \"Basso\"" >/dev/null 2>&1 || true
fi

# 3. Optional Slack/webhook — URL from .env
WEBHOOK=""
if [ -f "$DIR/.env" ]; then
  WEBHOOK="$(grep -E '^PIGGYBACK_ALERT_WEBHOOK=' "$DIR/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/[[:space:]]*$//')"
fi
if [ -n "$WEBHOOK" ]; then
  curl -s -m 10 -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 Dopamine harvest/pipeline: $MSG\"}" "$WEBHOOK" >/dev/null 2>&1 || true
fi

exit 0
