#!/usr/bin/env bash
# Wrap pgBackRest backup/check; exit non-zero triggers ops alert (Sprint 6 wires Telegram).
set -euo pipefail

STANZA="${PGBACKREST_STANZA:-filosign}"
TYPE="${1:-full}"
CONTAINER="${PGBACKREST_CONTAINER:-filosign-pgbackrest-dev}"

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
  # TODO(Sprint 6): emit platform alert (Telegram) on failure
  exit 1
fi

echo "pgbackrest ok: ${CMD[*]}"
