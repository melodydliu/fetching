#!/usr/bin/env bash
# Applies the migrations to a THROWAWAY local Postgres (with stand-ins for Supabase's auth and
# storage schemas) and runs supabase/tests/rls_behavior.sql against it as different users.
# Needs Postgres 15+ binaries on PATH (e.g. `brew install postgresql@16`). Touches nothing remote.
set -euo pipefail
cd "$(dirname "$0")/../.."
DIR=$(mktemp -d /tmp/fetching-pg.XXXX)
PORT=${PGTESTPORT:-54399}
trap 'pg_ctl -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
initdb -D "$DIR/data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$DIR/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" \
  -l "$DIR/log" start >/dev/null
sleep 2
psql_() { psql -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql_ -d postgres -c "create database t"
psql_ -d t -f supabase/tests/stubs.sql 2>&1 | grep -v "WARNING\|HINT" || true
for f in supabase/migrations/*.sql; do psql_ -d t -f "$f"; done
psql_ -d t -f supabase/tests/rls_behavior.sql 2>&1 | grep -E "PASS|FAIL|ALL DONE|ERROR" | sed 's/^psql:[^ ]* //'
