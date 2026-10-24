#!/usr/bin/env bash
#
# Tunnel the remote Postgres container to localhost so `next dev` can use it.
#
#   Scripts/db-tunnel.sh            # localhost:5433 -> VPS db:5432
#   Scripts/db-tunnel.sh 5434       # custom local port
#
# Keep this running in its own terminal; Ctrl-C closes the tunnel.
# Override targets via env: VPS, DB_CONTAINER, LOCAL_PORT.

set -euo pipefail

VPS="${VPS:-root@194.163.164.250}"
DB_CONTAINER="${DB_CONTAINER:-moskee-db-1}"
LOCAL_PORT="${1:-${LOCAL_PORT:-5433}}"

DB_IP="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS" \
  "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' '$DB_CONTAINER'")"

if [[ -z "$DB_IP" ]]; then
  echo "ERROR: could not resolve $DB_CONTAINER on $VPS (is the stack running?)" >&2
  exit 1
fi

echo "Tunneling localhost:$LOCAL_PORT -> $DB_CONTAINER ($DB_IP:5432) via $VPS"
echo "Press Ctrl-C to close."

exec ssh -N -L "$LOCAL_PORT:$DB_IP:5432" \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  "$VPS"
