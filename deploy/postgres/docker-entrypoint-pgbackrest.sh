#!/bin/sh
set -e

# pgBackRest locks/spool must be writable by the postgres OS user (archive-push runs as postgres).
mkdir -p /var/lib/pgbackrest
chown postgres:postgres /var/lib/pgbackrest

exec docker-entrypoint.sh "$@"
