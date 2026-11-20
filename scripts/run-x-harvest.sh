#!/bin/bash
# Scheduled X bookmark harvester (invoked by launchd). Same model as run-piggyback.sh:
# runs the PRE-BUILT harvester with an explicitly resolved node, under its own lock.
#
# The rule: at most one visit to X per run of this script. The harvester's exit code says
# what happened, and only code 5 (the browser never started, so nothing reached X) is retried.
#   0  captured, or cooling off
#   3  X refused (login wall, challenge, rate limit, error). Never retried: retrying a refusal
#      is exactly what gets an account restricted. A cool-off is recorded and you are alerted.
#   4  X's page did not behave as expected (format change, bookmarks never fetched). Not retried.
#   5  Chrome or its DevTools port did not come up. Retried up to 3 times.
#   other  unknown failure. Not retried.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
mkdir -p logs
LOGFILE="${DIR}/logs/x-harvest.log"

. "$DIR/scripts/lock.sh"
if ! acquire_lock "$DIR/.locks/xharvest"; then
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) skipped: another X harvest is already running ===" >> "$LOGFILE"
  exit 0
fi

NODE_BIN=""
for candidate in \
  "$HOME/.nvm/versions/node/$([ -f "$HOME/.nvm/alias/default" ] && cat "$HOME/.nvm/alias/default" 2>/dev/null)/bin/node" \
  "$HOME/.nvm/versions/node/v24.14.1/bin/node" \
  "$HOME/Library/pnpm/nodejs/24.0.2/bin/node" \
  "/usr/local/bin/node" \
  "/opt/homebrew/bin/node"; do
  if [ -x "$candidate" ]; then
    NODE_BIN="$candidate"
    break
  fi
done
if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm/versions/node" ]; then
  NODE_BIN="$(ls -1 "$HOME/.nvm/versions/node" | sort -V | tail -1 | xargs -I{} echo "$HOME/.nvm/versions/node/{}/bin/node")"
  [ -x "$NODE_BIN" ] || NODE_BIN=""
fi
if [ -z "$NODE_BIN" ]; then
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ERROR: no node binary found. PATH=$PATH ===" >> "$LOGFILE"
  exit 1
fi

# Cool-off marker of our own, in case the harvester could not write its status file.
MARKER="$DIR/.locks/xharvest-cooloff"
if [ -f "$MARKER" ]; then
  age=$(( $(date +%s) - $(stat -f %m "$MARKER" 2>/dev/null || echo 0) ))
  if [ "$age" -lt $((23 * 3600)) ]; then
    echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) skipped: cooling off after X refused (${age}s ago) ===" >> "$LOGFILE"
    exit 0
  fi
  rm -f "$MARKER"
fi

max_attempts=3
attempt=1
while true; do
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) x harvest attempt ${attempt}/${max_attempts} ===" >> "$LOGFILE"
  rc=0
  "$NODE_BIN" dist/pipeline/x-harvest/harvester.js >> "$LOGFILE" 2>&1 || rc=$?
  [ "$rc" -eq 0 ] && exit 0
  if [ "$rc" -eq 3 ]; then
    : > "$MARKER"
    echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) x harvest STOPPED by X (rc=3); not retrying, cooling off ===" >> "$LOGFILE"
    bash "$DIR/scripts/notify-failure.sh" "X harvest stopped: X asked for a login or a check. Cooling off about a day (rc=3)" || true
    exit 3
  fi
  if [ "$rc" -ne 5 ] || [ "$attempt" -ge "$max_attempts" ]; then
    echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) x harvest FAILED (rc=${rc}, attempt ${attempt}); not retrying ===" >> "$LOGFILE"
    bash "$DIR/scripts/notify-failure.sh" "X harvest failed (rc=${rc}). See logs/x-harvest.log" || true
    exit "$rc"
  fi
  echo "=== browser did not start (rc=5); retrying in 60s ===" >> "$LOGFILE"
  attempt=$((attempt + 1))
  sleep 60
done
