#!/bin/bash
# Runs after classifier finishes: sync categories, cascade Steps 8-11,
# force-rerun Step 15 (verify), run Step 16 (enrichment), final dashboard.
# Each step logs to /tmp/dopamine-{step}.log and exits non-zero on failure.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== CASCADE STARTING $(date) ==="

echo "[1/8] Sync category cascade (KB + analysis)"
node scripts/sync-category-cascade.cjs

echo "[2/8] Cleanup stale category folders"
node scripts/cleanup-stale-categories.cjs

echo "[3/8] Step 8 — Catalog generation"
START_STEP=7 END_STEP=8 node dist/pipeline/runner.js 2>&1 | tail -5

echo "[4/8] Step 9 — Folder organization"
START_STEP=8 END_STEP=9 node dist/pipeline/runner.js 2>&1 | tail -5

echo "[5/8] Step 10 — Markdown generation"
START_STEP=9 END_STEP=10 node dist/pipeline/runner.js 2>&1 | tail -5

echo "[6/8] Mark all verifications for force re-run"
node scripts/mark-verifications-rerun.cjs

echo "[7/8] Steps 15-16 — Verification synthesis + enrichment"
START_STEP=14 END_STEP=16 node dist/pipeline/runner.js 2>&1 | tail -15

echo "[8/8] Step 11 — Dashboard rebuild (with new verifications)"
START_STEP=10 END_STEP=11 node dist/pipeline/runner.js 2>&1 | tail -5

echo "=== CASCADE COMPLETE $(date) ==="
