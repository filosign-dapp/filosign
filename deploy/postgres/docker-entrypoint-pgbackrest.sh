#!/bin/bash
set -e

# pgBackRest lock/spool/log must be writable by the postgres OS user (archive-push runs as postgres).
mkdir -p /var/lib/pgbackrest/lock /var/lib/pgbackrest/log
chown -R postgres:postgres /var/lib/pgbackrest

# pgBackRest restore leaves restore_command in postgresql.auto.conf. After promote, that file
# must not remain on a primary (ignored while running, breaks clarity and next recovery).
strip_stale_recovery_auto_conf() {
  local candidates=()
  [[ -n "${PGDATA:-}" ]] && candidates+=("$PGDATA")
  candidates+=(/var/lib/postgresql/18/docker /var/lib/postgresql/data)

  local pgdata auto tmp
  for pgdata in "${candidates[@]}"; do
    [[ -d "$pgdata" ]] || continue
    auto="${pgdata}/postgresql.auto.conf"
    [[ -f "$auto" ]] || continue
    [[ -f "${pgdata}/recovery.signal" || -f "${pgdata}/standby.signal" ]] && return 0
    grep -qE '^restore_command\s*=' "$auto" 2>/dev/null || return 0

    tmp="$(mktemp)"
    grep -vE '^(restore_command|recovery_end_command|recovery_target|recovery_target_action|primary_slot_name)\s*=' \
      "$auto" >"$tmp" || true
    if grep -qvE '^\s*(#|$)' "$tmp" 2>/dev/null; then
      mv "$tmp" "$auto"
      chown postgres:postgres "$auto"
    else
      rm -f "$auto" "$tmp"
    fi
    return 0
  done
}

strip_stale_recovery_auto_conf

exec docker-entrypoint.sh "$@"
