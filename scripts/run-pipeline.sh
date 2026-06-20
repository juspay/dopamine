#!/bin/bash
# Daily pipeline launcher for launchd
# Logs to timestamped file, runs node directly (no npm/tsc overhead)

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOGFILE="${DIR}/logs/pipeline-$(date +%Y-%m-%d).log"

exec >> "$LOGFILE" 2>&1

echo "=== Pipeline run started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

cd "$DIR"

# Resolve node binary — launchd starts with minimal PATH that may not include
# nvm/pnpm/homebrew. Try common locations in order.
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

# Fallback: latest installed nvm version
if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm/versions/node" ]; then
  NODE_BIN="$(ls -1 "$HOME/.nvm/versions/node" | sort -V | tail -1 | xargs -I{} echo "$HOME/.nvm/versions/node/{}/bin/node")"
  [ -x "$NODE_BIN" ] || NODE_BIN=""
fi

if [ -z "$NODE_BIN" ]; then
  echo "ERROR: No node binary found. PATH=$PATH"
  exit 1
fi

echo "Using node: $NODE_BIN ($("$NODE_BIN" --version))"

# Run the pre-built pipeline (build separately when code changes)
exec "$NODE_BIN" dist/pipeline/runner.js
