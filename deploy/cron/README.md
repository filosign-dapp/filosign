# VPS cron (production backups)

pgBackRest does not schedule itself. Install once on the Hetzner/Dokploy host.

## Install

1. Confirm postgres container name:

   ```bash
   docker ps --format '{{.Names}}' | grep postgres
   ```

2. Edit `pgbackrest.prod.crontab.example` if the container name differs, then on the VPS:

   ```bash
   sudo tee /etc/cron.d/filosign-pgbackrest << 'EOF'
   SHELL=/bin/bash
   PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

   15 3 * * * root docker exec -u postgres filosign-proddata-wcm84h-postgres-1 pgbackrest --stanza=filosign check >> /var/log/filosign-pgbackrest.log 2>&1
   30 3 * * * root docker exec -u postgres filosign-proddata-wcm84h-postgres-1 pgbackrest --stanza=filosign backup --type=diff >> /var/log/filosign-pgbackrest.log 2>&1
   15 4 * * 0 root docker exec -u postgres filosign-proddata-wcm84h-postgres-1 pgbackrest --stanza=filosign backup --type=full >> /var/log/filosign-pgbackrest.log 2>&1
   EOF

   sudo chmod 644 /etc/cron.d/filosign-pgbackrest
   sudo touch /var/log/filosign-pgbackrest.log
   ```

3. Verify:

   ```bash
   cat /etc/cron.d/filosign-pgbackrest
   docker exec -u postgres filosign-proddata-wcm84h-postgres-1 pgbackrest --stanza=filosign info
   ```

## Schedule (UTC)

| When | Job |
|------|-----|
| Daily 03:15 | `check` |
| Daily 03:30 | `diff` backup |
| Sunday 04:15 | `full` backup |

Also run a manual `full` before `bun run db -- migrate production`.

## Logs

```bash
tail -50 /var/log/filosign-pgbackrest.log
```
