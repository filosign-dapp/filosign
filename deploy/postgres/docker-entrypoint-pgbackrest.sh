#!/bin/bash
set -e

# pgBackRest lock/spool/log must be writable by the postgres OS user (archive-push runs as postgres).
mkdir -p /var/lib/pgbackrest/lock /var/lib/pgbackrest/spool /var/lib/pgbackrest/log
chown -R postgres:postgres /var/lib/pgbackrest

exec docker-entrypoint.sh "$@"
