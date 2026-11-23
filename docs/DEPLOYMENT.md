# Deployment guide

## Environments

| | local | staging | production |
| --- | --- | --- | --- |
| Purpose | development | try every change exactly as it will run | real users |
| Trigger | you | merge to `main` (automatic) | git tag `vX.Y.Z` + manual approval |
| Database | embedded Postgres / compose | own Postgres volume | own Postgres volume, backed up before each deploy |
| Payments | `mock` | `mock` (or Stripe test keys) | `stripe` only (API refuses to start with `mock`) |
| Secrets | `apps/api/.env` | `/opt/bustravel/staging/.env` | `/opt/bustravel/production/.env` |
| Domain | localhost | `staging.example.com` | `example.com` |

The same container images are promoted from staging to production; nothing is rebuilt between them. A bug found in production can always be traced to one commit SHA (the image tag).

## One-time server setup (Ubuntu VPS)

Run as root on a fresh server. Do this once per server; staging and production may share a server (different directories, different compose project names) or live on separate ones.

```bash
# 1. Non-root deploy user, SSH key only
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh && echo "<public key of the CI deploy key>" > /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# 2. SSH hardening: no passwords, no root login
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl reload ssh

# 3. Firewall: only SSH, HTTP, HTTPS
ufw default deny incoming && ufw allow OpenSSH && ufw allow 80,443/tcp && ufw --force enable

# 4. Docker (official repository) and the deploy user may use it
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# 5. Directories and env files (one per environment)
mkdir -p /opt/bustravel/{staging,production}
chown -R deploy:deploy /opt/bustravel
# then, as deploy: copy deploy/.env.server.example to /opt/bustravel/<env>/.env, fill it in, chmod 600
```

DNS: point `staging.example.com` and `example.com` at the server's IP. Caddy obtains and renews the TLS certificates automatically on first start.

Generate secrets with `openssl rand -hex 32` (use different values for staging and production).

## GitHub configuration

**Settings > Environments**: create `staging` and `production`. On `production` enable **Required reviewers** (this is the manual approval gate) and restrict deployment to tags.

Per environment, add:

| Name | Kind | Value |
| --- | --- | --- |
| `SSH_HOST` | secret | server address |
| `SSH_USER` | secret | `deploy` |
| `SSH_PRIVATE_KEY` | secret | private half of the deploy key (a key used for nothing else) |
| `SSH_KNOWN_HOSTS` | secret | output of `ssh-keyscan -t ed25519 <host>`; pins the server identity so CI cannot be tricked by a man in the middle |
| `GHCR_PULL_TOKEN` | secret | fine-grained token with `read:packages`, so the server can pull images |
| `DOMAIN` | variable | `staging.example.com` / `example.com` |

**Settings > Branches**: protect `main`: require a pull request, require the CI checks (`API`, `Web`, `UI end-to-end`, `Docker images build`) to pass, no force pushes.

## Releasing

```bash
# staging: just merge the PR. Every merge to main deploys automatically.

# production: tag the commit that is already running fine on staging
git tag v1.4.0 && git push origin v1.4.0
# -> GitHub waits for a reviewer to approve the "production" environment -> deploy.sh runs
```

## What `deploy.sh` does

1. Pulls the new images (the server never builds anything).
2. `pg_dump` into `backups/pre-<tag>-<timestamp>.sql.gz` before any migration can run.
3. `docker compose up -d`: the `migrate` container runs `prisma migrate deploy` first; the API only starts when it succeeded.
4. Polls `https://<domain>/api/health` (the full public path: Caddy, web, API, database) for up to two minutes.
5. Healthy: remembers the tag in `.current_tag`. Not healthy: prints logs and redeploys the previous tag.

**Rollback by hand:** `./deploy.sh production <previous-sha>`; the previous tags are in the GitHub Actions history and in GHCR.
Migrations only move forward, so write them backwards compatible (expand, then contract in a later release): add the new column as nullable first, stop using the old one, drop it one release later.

## Backups and restore

* Automatic: one dump before every deploy (kept in `backups/`).
* Regular: add a cron entry on the server for a nightly dump and copy it off the machine (object storage); retention 14 days.
* Restore: `gunzip -c backups/<file>.sql.gz | docker compose -p bt-production exec -T db psql -U bustravel bustravel` (into an empty database).
* Test a restore on staging regularly; an untested backup is only a hope.

## Observability

* `/api/health` (200 with `db: up`) is used by Docker `HEALTHCHECK`, the deploy script and can be used by an uptime monitor.
* `docker compose -p bt-production logs -f api` for live logs. Logs go to stdout (12-factor), so any log shipper can pick them up later.
* Next steps: an uptime monitor on `/api/health`, error tracking (Sentry), and DB metrics.

## Alternatives and next steps

* **Web on Vercel**: possible and simple (`apps/web`, root directory `apps/web`, set `API_URL` to the public API URL). The API and database would then need a public HTTPS endpoint; cookies stay first-party because of the `/api` rewrite. Preview deployments per pull request come for free.
* **Managed database** (Neon, Supabase, RDS): replace the `db` service with a `DATABASE_URL`; keep the pre-deploy dump or use the provider's point-in-time recovery.
* **Kubernetes**: not needed for one small app on one VPS. Worth it with several services, several hosts or autoscaling. The mapping is direct: each Compose service becomes a Deployment + Service, the `migrate` container becomes a Job (or Helm pre-upgrade hook), `.env` becomes Secret/ConfigMap, Caddy becomes an Ingress with cert-manager, `/api/health` becomes liveness/readiness probes.
