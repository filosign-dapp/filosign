# Single-container Postgres + pgBackRest (Docker VPS best practice — no SSH sidecar).
# Pattern: https://dataegret.com/2025/12/pgbackrest-pitr-in-docker-a-simple-demo/
# pgBackRest from PGDG so version matches upstream docs (not stale distro packages).

FROM postgres:18

RUN apt-get update \
    && apt-get install -y wget gnupg lsb-release \
    && wget --quiet -O /usr/share/keyrings/postgresql-archive-keyring.asc \
        https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.asc] \
        http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y pgbackrest \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/pgbackrest
COPY pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
COPY docker-entrypoint-pgbackrest.sh /usr/local/bin/docker-entrypoint-pgbackrest.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-pgbackrest.sh

ENTRYPOINT ["docker-entrypoint-pgbackrest.sh"]
