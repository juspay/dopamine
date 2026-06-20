#!/bin/bash
# Dashboard server launcher for launchd.
# Resolves node binary dynamically (NVM/pnpm/Homebrew change paths over time;
# baking a single absolute path into the plist breaks every few months).

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOGDIR="${DIR}/logs"
LOGFILE="${LOGDIR}/dashboard-launcher.log"

mkdir -p "$LOGDIR"
exec >> "$LOGFILE" 2>&1

echo "=== Dashboard launcher started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

cd "$DIR"

# Resolve node binary
NODE_BIN=""
for candidate in \
  "$HOME/.nvm/versions/node/$([ -f "$HOME/.nvm/alias/default" ] && cat "$HOME/.nvm/alias/default" 2>/dev/null)/bin/node" \
  "$HOME/.nvm/versions/node/v24.14.1/bin/node" \
  "$HOME/Library/pnpm/nodejs/24.0.2/bin/node" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node"; do
  if [ -x "$candidate" ]; then
    NODE_BIN="$candidate"
    break
  fi
done

# Fallback: latest nvm version
if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm/versions/node" ]; then
  NODE_BIN="$(ls -1 "$HOME/.nvm/versions/node" | sort -V | tail -1 | xargs -I{} echo "$HOME/.nvm/versions/node/{}/bin/node")"
  [ -x "$NODE_BIN" ] || NODE_BIN=""
fi

if [ -z "$NODE_BIN" ]; then
  echo "ERROR: No node binary found. PATH=$PATH"
  exit 1
fi

echo "Using node: $NODE_BIN ($("$NODE_BIN" --version))"

exec "$NODE_BIN" dist/server/dashboard-server.js
