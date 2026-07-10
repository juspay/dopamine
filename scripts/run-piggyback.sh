#!/bin/bash
# Scheduled-Chrome piggyback harvester runner (invoked by launchd).
# Path-agnostic: resolves the repo root from this script's location.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
npm run build >> logs/piggyback.log 2>&1
node dist/pipeline/piggyback/harvester.js >> logs/piggyback.log 2>&1
