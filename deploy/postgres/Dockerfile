FROM postgres:18-alpine
RUN apk add --no-cache pgbackrest
COPY docker-entrypoint-pgbackrest.sh /usr/local/bin/docker-entrypoint-pgbackrest.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-pgbackrest.sh
ENTRYPOINT ["docker-entrypoint-pgbackrest.sh"]
