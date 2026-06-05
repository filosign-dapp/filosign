# VPS host setup (Filosign)

Baseline hardening for a solo Hetzner (or similar) box running Dokploy + Docker Compose. Apply on the **host OS**, not inside app containers.

## Swap (4 GB)

Prevents OOM kills when Postgres + Dragonfly + API spike during deploys or backups.

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify: `swapon --show` and `free -h`.

## Docker log rotation

Unbounded `json-file` logs can fill the root disk.

Create or merge `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

Then: `sudo systemctl restart docker` (brief downtime for running containers).

## Firewall

- Allow **22** (SSH), **80/443** (reverse proxy / Dokploy), and any ports you explicitly publish.
- Do **not** expose Postgres `5432` or Dragonfly `6379` on the public interface. Compose uses `expose` only — confirm Dokploy does not map them to the host.

## Dokploy checklist

1. Deploy **data** stack first (`deploy/compose.data.yml`) — see [`dokploy-deploy.md`](dokploy-deploy.md).
2. Deploy **app** stack (`deploy/compose.app.yml`) on the shared Docker network.
3. Inject secrets from Infisical; never commit `.env` files.
4. **Worker replicas = 1** on solo VPS. Relayer Redis lock (`fs:lock:relayer:{address}`) serializes nonce usage, but multiple workers still multiply job concurrency and operational risk.
5. Schedule pgBackRest jobs on the data project (see [`postgres-ops.md`](postgres-ops.md)).
6. Monitor Dragonfly memory and evictions — see [`dragonfly-bullmq-production.md`](dragonfly-bullmq-production.md).

## Relayer wallet

- Fund `FC_SERVER_ADDRESS` with a **small** operational balance (gas only; settlements use user USDC).
- Set alerts when balance drops (cron: `monitor-relayer-gas` in the API/worker).

## Related

- [`dokploy-deploy.md`](dokploy-deploy.md) — two-stack topology, env vars, worker scale
- [`deploy/README.md`](../../deploy/README.md) — compose file map
