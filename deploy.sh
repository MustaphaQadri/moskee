#!/usr/bin/env bash
#
# One-command deploy for the Moskee app.
#
#   pnpm run deploy                 rsync code, rebuild, migrate, restart
#   pnpm run deploy -- --seed       also run the seed script (first deploy)
#   pnpm run deploy -- --restore-db one-time: copy the LOCAL database to the VPS
#   pnpm run deploy -- --sync-uploads one-time: copy LOCAL uploads to the VPS
#
# Override targets via env: VPS, REMOTE_DIR, HEALTH_URL.

set -euo pipefail

VPS="${VPS:-root@194.163.164.250}"
REMOTE_DIR="${REMOTE_DIR:-/srv/moskee}"
HEALTH_URL="${HEALTH_URL:-http://194.163.164.250}"
APP_USER_UID="${APP_USER_UID:-1001}"

SEED=0
RESTORE_DB=0
SYNC_UPLOADS=0

usage() {
  grep '^#' "$0" | cut -c3-
}

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=1 ;;
    --restore-db) RESTORE_DB=1 ;;
    --sync-uploads) SYNC_UPLOADS=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 1 ;;
  esac
done

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31mERROR:\033[0m %s\n' "$1" >&2; exit 1; }

compose_remote() {
  ssh "$VPS" "cd '$REMOTE_DIR' && docker compose $*"
}

info "Checking SSH access to $VPS"
ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS" 'true' || fail "Cannot SSH to $VPS"

info "Syncing code to $VPS:$REMOTE_DIR"
rsync -az --delete --no-owner --no-group \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'uploads' \
  --exclude 'public/uploads' \
  ./ "$VPS:$REMOTE_DIR/"

ssh "$VPS" "test -f '$REMOTE_DIR/.env'" \
  || fail "Missing $REMOTE_DIR/.env on the server (copy .env.production.example and fill it in)"

if [[ "$RESTORE_DB" == "1" ]]; then
  info "Restoring the LOCAL database into the VPS db container (destructive)"
  LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')}"
  [[ -n "${LOCAL_DATABASE_URL:-}" ]] || fail "Set LOCAL_DATABASE_URL or add DATABASE_URL to .env"
  # Strip Prisma-specific query params (e.g. ?schema=public); pg_dump rejects them.
  LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL%%\?*}"
  LOCAL_DB_CONTAINER="${LOCAL_DB_CONTAINER:-moskee-db}"
  LOCAL_DB_USER="${LOCAL_DB_USER:-$(printf '%s' "$LOCAL_DATABASE_URL" | sed -E 's|^[^:]+://([^:@/]+).*|\1|')}"
  LOCAL_DB_NAME="${LOCAL_DB_NAME:-$(printf '%s' "$LOCAL_DATABASE_URL" | sed -E 's|^.*/([^/?]+)$|\1|')}"

  # Prefer pg_dump from the local Postgres container so the client version
  # matches the server (a newer pg_dump emits GUCs older servers reject).
  if [[ "$(docker inspect -f '{{.State.Running}}' "$LOCAL_DB_CONTAINER" 2>/dev/null)" == "true" ]]; then
    info "Dumping via container $LOCAL_DB_CONTAINER (as $LOCAL_DB_USER/$LOCAL_DB_NAME)"
    dump_local_db() {
      docker exec "$LOCAL_DB_CONTAINER" pg_dump --no-owner --clean --if-exists -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME"
    }
  else
    info "Dumping via local pg_dump ($(pg_dump --version | cut -d' ' -f3))"
    dump_local_db() {
      pg_dump --no-owner --clean --if-exists "$LOCAL_DATABASE_URL"
    }
  fi

  compose_remote "up -d db"
  info "Waiting for Postgres to accept connections"
  for _ in $(seq 1 30); do
    if compose_remote "exec -T db sh -c 'pg_isready -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\"'" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  dump_local_db \
    | ssh "$VPS" "cd '$REMOTE_DIR' && docker compose exec -T db psql -v ON_ERROR_STOP=1 -U moskee -d moskee" \
    || fail "Database restore failed"
  info "Database restored"
fi

if [[ "$SYNC_UPLOADS" == "1" ]]; then
  info "Syncing LOCAL public/uploads to the server"
  ssh "$VPS" "mkdir -p '$REMOTE_DIR/uploads'"
  rsync -az --delete --no-owner --no-group public/uploads/ "$VPS:$REMOTE_DIR/uploads/"
  ssh "$VPS" "chown -R '$APP_USER_UID:$APP_USER_UID' '$REMOTE_DIR/uploads'"
  info "Uploads synced"
fi

info "Building the app image on the server"
compose_remote "build app"

info "Applying database migrations"
compose_remote "--profile tools run --rm migrate"

if [[ "$SEED" == "1" ]]; then
  info "Running the seed script"
  compose_remote "--profile tools run --rm migrate pnpm db:seed"
fi

info "Starting the stack"
compose_remote "up -d"

info "Waiting for $HEALTH_URL to respond"
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [[ "$code" == "200" ]]; then
    info "Deploy complete — $HEALTH_URL is up (HTTP $code)"
    compose_remote "ps"
    exit 0
  fi
  sleep 3
done

compose_remote "ps"
compose_remote "logs --tail=50 app caddy"
fail "App did not become healthy at $HEALTH_URL"
