#!/usr/bin/env bash
# Wrap pgBackRest backup/check; exit non-zero triggers ops alert (Sprint 6 wires Telegram).
set -euo pipefail

STANZA="${PGBACKREST_STANZA:-filosign}"
TYPE="${1:-full}"
CONTAINER="${PGBACKREST_CONTAINER:-filosign-postgres}"

case "$TYPE" in
  full | diff | incr)
    CMD=(backup --type="$TYPE")
    ;;
  check)
    CMD=(check)
    ;;
  *)
    echo "Usage: $0 [full|diff|incr|check]" >&2
    exit 2
    ;;
esac

if ! docker exec "$CONTAINER" pgbackrest --stanza="$STANZA" "${CMD[@]}"; then
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
