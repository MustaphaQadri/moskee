# Deployment

The app runs on the VPS (`194.163.164.250`, Ubuntu 24.04) as a Docker Compose
stack: a Next.js standalone container, PostgreSQL, and Caddy (reverse proxy +
automatic HTTPS). Uploaded images live on the host in `/srv/moskee/uploads`.

## Deploy

From the repo root:

```bash
pnpm run deploy
```

The script (`deploy.sh`) rsyncs the code to `/srv/moskee`, rebuilds the image on
the server, applies Prisma migrations, restarts the stack, and waits for a
healthy response. Useful flags:

| Flag | Purpose |
| --- | --- |
| `--seed` | run `prisma db seed` (first manager, default timeslots) |
| `--restore-db` | one-time: copy the **local** database to the VPS (destructive) |
| `--sync-uploads` | one-time: copy local `public/uploads` to the VPS |

Targets can be overridden with env vars: `VPS`, `REMOTE_DIR`, `HEALTH_URL`.

## Environment

The server keeps its secrets in `/srv/moskee/.env` (not in git; rsync never
overwrites it). Template: `.env.production.example`.

## Common operations

```bash
ssh root@194.163.164.250
cd /srv/moskee

docker compose ps                    # status
docker compose logs -f app           # app logs
docker compose logs -f caddy         # proxy / TLS logs
docker compose restart app           # restart the app
docker compose --profile tools run --rm migrate   # run migrations manually
```

## Database

Postgres data lives in the `pgdata` Docker volume. Nightly backups are written
to `/srv/backups` by `/etc/cron.d/moskee-backup` (14-day retention).

Restore a backup:

```bash
cd /srv/moskee
gunzip -c /srv/backups/moskee-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U moskee -d moskee
```

## HTTPS (when a domain is available)

Let's Encrypt certificates require a real domain name — they cannot be issued
for a bare IP. Once you have a domain:

1. Point its `A` record (and `AAAA`, or remove `AAAA`) at `194.163.164.250`.
2. On the server, edit `/srv/moskee/.env`:
   ```
   SITE_ADDRESS=app.example.com
   BETTER_AUTH_URL=https://app.example.com
   ```
3. Apply: `cd /srv/moskee && docker compose up -d`.

Caddy obtains the certificate and renews it automatically; certificates are
persisted in the `caddy_data` volume, so redeploys don't affect them.
