#!/bin/bash
# Single-instance guard for the scheduled runners. Sourced, not executed.
#
# macOS ships no flock(1), so this uses mkdir: creating a directory is atomic on
# POSIX filesystems, so exactly one caller can win the race.
#
# At one run per day two runs could never meet. At four per day a slow or
# retrying run can still be going when the next slot fires, and both the
# pipeline and the harvester do read-modify-write on the same JSON state
# (metadata.json, verifications.json, ...). Two concurrent writers do not
# corrupt the file — the loser simply overwrites with a copy it read before the
# winner's changes existed, so the winner's work vanishes with no error anywhere.
#
# Usage:
#   . "$DIR/scripts/lock.sh"
#   acquire_lock "$DIR/.locks/pipeline" || { echo "busy"; exit 0; }

# Claim <lockdir>. Returns 0 on success, 1 if a live process already holds it.
# On success, registers an EXIT/INT/TERM trap that releases the lock.
acquire_lock() {
  local lockdir="$1"
  mkdir -p "$(dirname "$lockdir")"

  if mkdir "$lockdir" 2>/dev/null; then
    printf '%s' "$$" > "$lockdir/pid"
    # shellcheck disable=SC2064  # expand lockdir now, not at trap time
    trap "rm -rf '$lockdir'" EXIT INT TERM
    return 0
  fi

  # Directory exists. Either a run is live, or a previous one was killed
  # (rc=137 has happened here) or the machine rebooted mid-run, leaving the
  # lock behind. A stale lock must not wedge the schedule forever.
  local owner
  owner="$(cat "$lockdir/pid" 2>/dev/null || true)"
  if [ -n "$owner" ] && kill -0 "$owner" 2>/dev/null; then
    return 1
  fi

  rm -rf "$lockdir"
  if mkdir "$lockdir" 2>/dev/null; then
    printf '%s' "$$" > "$lockdir/pid"
    # shellcheck disable=SC2064
    trap "rm -rf '$lockdir'" EXIT INT TERM
    return 0
  fi
  # Lost the reclaim race to another starting run — it holds it, we yield.
  return 1
}
