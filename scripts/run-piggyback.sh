#!/bin/bash
# Scheduled-Chrome piggyback harvester runner (invoked by launchd).
# Path-agnostic: resolves the repo root from this script's location.
#
# Runs the PRE-BUILT harvester with an explicitly-resolved node binary. It must
# NOT depend on `npm` or anything on the interactive PATH: launchd starts with a
# minimal PATH, so the previous `npm run build` here failed with exit 127 and the
# harvester never launched. Build separately when code changes (same model as
# run-pipeline.sh).
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
mkdir -p logs
LOGFILE="${DIR}/logs/piggyback.log"

# Resolve node — launchd's minimal PATH may not include nvm/pnpm/homebrew.
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

# Fallback: latest installed nvm version.
if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm/versions/node" ]; then
  NODE_BIN="$(ls -1 "$HOME/.nvm/versions/node" | sort -V | tail -1 | xargs -I{} echo "$HOME/.nvm/versions/node/{}/bin/node")"
  [ -x "$NODE_BIN" ] || NODE_BIN=""
fi

if [ -z "$NODE_BIN" ]; then
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ERROR: no node binary found. PATH=$PATH ===" >> "$LOGFILE"
  exit 1
fi

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) harvest start (node $("$NODE_BIN" --version)) ===" >> "$LOGFILE"
exec "$NODE_BIN" dist/pipeline/piggyback/harvester.js >> "$LOGFILE" 2>&1
