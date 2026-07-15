#!/bin/bash
# Manual on-demand run: harvest saved posts, then run the full pipeline (enrich +
# rebuild dashboard). Use this instead of waiting for the scheduled 8:00/8:30
# launchd jobs — e.g. to pull fresh saves right now, or to recover after a failed
# auto-run. Safe to run anytime: the harvest and metadata ingest are idempotent.
#
#   bash scripts/run-now.sh
#
# Runs the PRE-BUILT dist (build separately when code changes). No npm dependency.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
mkdir -p logs

# Resolve node — mirror run-pipeline.sh / run-piggyback.sh (launchd/minimal PATH safe).
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
[ -n "$NODE_BIN" ] || { echo "ERROR: no node binary found. PATH=$PATH"; exit 1; }

echo "=== [$(date -u +%Y-%m-%dT%H:%M:%SZ)] manual run — harvest ==="
if "$NODE_BIN" dist/pipeline/piggyback/harvester.js; then
  echo "  harvest ok"
else
  echo "  WARNING: harvest exited non-zero ($?) — continuing to the pipeline anyway (it enriches videos already on disk)"
fi

echo "=== [$(date -u +%Y-%m-%dT%H:%M:%SZ)] manual run — pipeline ==="
exec "$NODE_BIN" dist/pipeline/runner.js
