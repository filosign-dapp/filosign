#!/usr/bin/env bash
# Wrap pgBackRest backup/check; exit non-zero triggers ops alert (Sprint 6 wires Telegram).
set -euo pipefail

STANZA="${PGBACKREST_STANZA:-filosign}"
TYPE="${1:-full}"
CONTAINER="${PGBACKREST_CONTAINER:-filosign-data-postgres-1}"

case "$TYPE" in
  full | diff | incr)
    CMD=(backup --type="$TYPE")
    ;;
  check)
    CMD=(check)
    ;;
  check-wal)
    # Default: 2x production archive_timeout (300s) + slack for archive-push latency
    MAX_LAG="${WAL_ARCHIVE_MAX_LAG_SEC:-660}"
    read -r mode lag <<<"$(
      docker exec "$CONTAINER" psql -U filosign -d filosign -t -A -c \
        "SELECT current_setting('archive_mode') || ' ' || COALESCE(EXTRACT(EPOCH FROM (now() - last_archived_time))::int, 999999) FROM pg_stat_archiver;"
    )"
    if [[ "$mode" != "on" ]]; then
      echo "pgbackrest check-wal failed: archive_mode=$mode (expected on)" >&2
      exit 1
    fi
    if ((lag > MAX_LAG)); then
      echo "pgbackrest check-wal failed: lag=${lag}s exceeds ${MAX_LAG}s (raise archive_timeout or inspect archive-push)" >&2
      exit 1
    fi
    echo "pgbackrest check-wal ok: lag=${lag}s"
    exit 0
    ;;
  *)
    echo "Usage: $0 [full|diff|incr|check|check-wal]" >&2
    exit 2
    ;;
esac

if ! docker exec -u postgres "$CONTAINER" pgbackrest --stanza="$STANZA" "${CMD[@]}"; then
  echo "pgbackrest failed: stanza=$STANZA cmd=${CMD[*]}" >&2
  REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  if command -v bun >/dev/null 2>&1; then
    bun run "$REPO_ROOT/apps/server/scripts/pgbackrest-failure-alert.ts" \
      "$STANZA" "$TYPE" "$CONTAINER" || true
  else
    echo "warn: bun not found; skipped platform alert (set TG_ANALYTICS on cron host)" >&2
  fi
  exit 1
fi

echo "pgbackrest ok: ${CMD[*]}"
