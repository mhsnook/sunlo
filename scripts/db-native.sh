#!/usr/bin/env bash
#
# db-native.sh — stand up a *native* Postgres (no Docker) for schema/migration work.
#
# Why this exists
# ---------------
# Local Supabase (`supabase start`) runs Postgres + auth + PostgREST + realtime as
# Docker containers. Claude Code's web environment can't run Docker, so `supabase
# start` / `supabase db reset` don't work there. But the container *does* ship the
# Postgres 16 server binaries, and everything below the API layer — applying
# migrations, loading seeds, dumping the schema, generating types — only needs a
# plain Postgres. This script provisions one and reproduces the minimal Supabase
# baseline (roles, auth schema, stub extensions) that `base.sql` and the seeds
# assume. See `supabase/dev-native/bootstrap.sql` and `.../extensions/README.md`.
#
# What it is NOT: real auth. `auth.uid()` returns NULL, so RLS is effectively off.
# Use CI (Docker) or a real Supabase project to test RLS/auth behaviour.
#
# Usage
# -----
#   scripts/db-native.sh up              # provision + start Postgres (idempotent)
#   scripts/db-native.sh reset           # recreate DB: bootstrap + base.sql + seeds
#   scripts/db-native.sh apply FILE...   # apply migration file(s) on the running DB
#   scripts/db-native.sh dump [FILE]     # dump schema (default: supabase/schemas/base.sql)
#   scripts/db-native.sh types [FILE]    # gen types (default: src/types/supabase.ts)
#   scripts/db-native.sh psql [args...]  # open psql against the DB
#   scripts/db-native.sh status          # show connection info
#   scripts/db-native.sh stop            # stop the cluster
#
# Typical flow after writing a migration:
#   scripts/db-native.sh reset
#   scripts/db-native.sh apply supabase/migrations/<new>.sql   # <- does it apply?
#   scripts/db-native.sh dump                                  # <- new base.sql to commit
#   scripts/db-native.sh types                                 # <- regenerate TS types
#
set -euo pipefail

# --- config -----------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_OWNER="pgnative"            # unprivileged user that owns the server process
PG_HOME="/home/${PG_OWNER}"
PGDATA="${PG_HOME}/pgdata"
PGSOCK="${PG_HOME}/sock"
PGPORT="54399"
DBNAME="sunlo"
PGVECTOR_VERSION="v0.8.0"      # apt ships 0.6.0; the dump needs halfvec/sparsevec (>=0.7)
DB_URL="postgresql://postgres@127.0.0.1:${PGPORT}/${DBNAME}"

PGBIN="$(echo /usr/lib/postgresql/*/bin | tr ' ' '\n' | sort -V | tail -1)"
[ -x "${PGBIN}/postgres" ] || { echo "!! Postgres server binaries not found under /usr/lib/postgresql/*/bin"; exit 1; }
PG_MAJOR="$(basename "$(dirname "${PGBIN}")")"
EXTDIR="/usr/share/postgresql/${PG_MAJOR}/extension"

# Logs go to stderr so command output (psql -tAc, dumps to stdout) stays clean.
log() { printf '\033[36m== %s\033[0m\n' "$*" >&2; }
die() { printf '\033[31m!! %s\033[0m\n' "$*" >&2; exit 1; }

# Run a command as the unprivileged PG owner (server ops must not run as root).
as_owner() { runuser -u "${PG_OWNER}" -- "$@"; }

# psql/pg_dump are client tools; fine to run as the current user over TCP.
PSQL() { "${PGBIN}/psql" "${DB_URL}" -v ON_ERROR_STOP=1 "$@"; }

require_root() { [ "$(id -u)" = "0" ] || die "'$1' needs root (apt / postgres extension dir / creating ${PG_OWNER})"; }

# --- provisioning steps -----------------------------------------------------

ensure_owner() {
  id "${PG_OWNER}" >/dev/null 2>&1 || { require_root ensure_owner; useradd -m -s /bin/bash "${PG_OWNER}"; }
}

ensure_pgvector() {
  # Need pgvector >= 0.7 (halfvec/sparsevec). apt has 0.6.0, so build from source once.
  local ctl="${EXTDIR}/vector.control" cur=""
  [ -f "${ctl}" ] && cur="$(sed -n "s/.*default_version *= *'\([0-9.]*\)'.*/\1/p" "${ctl}")"
  if [ -n "${cur}" ] && [ "$(printf '%s\n0.7.0\n' "${cur}" | sort -V | head -1)" = "0.7.0" ]; then
    log "pgvector ${cur} already installed"; return
  fi
  require_root ensure_pgvector
  log "building pgvector ${PGVECTOR_VERSION} from source (apt's 0.6.0 lacks halfvec/sparsevec grants)"
  apt-get update -q >/dev/null
  apt-get install -y -q "postgresql-server-dev-${PG_MAJOR}" build-essential git >/dev/null
  local tmp; tmp="$(mktemp -d)"
  git clone --depth 1 --branch "${PGVECTOR_VERSION}" https://github.com/pgvector/pgvector.git "${tmp}" >/dev/null 2>&1
  make -C "${tmp}" PG_CONFIG="${PGBIN}/pg_config" >/dev/null 2>&1
  make -C "${tmp}" PG_CONFIG="${PGBIN}/pg_config" install >/dev/null 2>&1
  rm -rf "${tmp}"
  log "pgvector installed"
}

install_fake_extensions() {
  # Empty, relocatable stubs so `create extension <name>` succeeds. The objects a
  # couple of functions actually reference live in bootstrap.sql, not here.
  require_root install_fake_extensions
  local n
  for n in pg_net supabase_vault pg_graphql pgjwt pg_cron; do
    cat > "${EXTDIR}/${n}.control" <<CTL
comment = 'native-dev stub for ${n} (schema/migration/type work only, no runtime behaviour)'
default_version = '1.0'
relocatable = true
CTL
    echo "-- native-dev stub: no objects (see supabase/dev-native/bootstrap.sql)" > "${EXTDIR}/${n}--1.0.sql"
  done
  log "installed fake extension stubs: pg_net supabase_vault pg_graphql pgjwt pg_cron"
}

init_cluster() {
  if as_owner test -f "${PGDATA}/PG_VERSION"; then log "cluster already initialised"; return; fi
  ensure_owner
  log "initdb at ${PGDATA}"
  as_owner mkdir -p "${PGDATA}" "${PGSOCK}"
  as_owner "${PGBIN}/initdb" -D "${PGDATA}" -U postgres --auth=trust --no-sync >/dev/null
}

start_cluster() {
  if as_owner "${PGBIN}/pg_ctl" -D "${PGDATA}" status >/dev/null 2>&1; then log "Postgres already running"; return; fi
  log "starting Postgres on 127.0.0.1:${PGPORT}"
  as_owner "${PGBIN}/pg_ctl" -D "${PGDATA}" -w -l "${PG_HOME}/pg.log" \
    -o "-p ${PGPORT} -k ${PGSOCK} -c listen_addresses=127.0.0.1" start >/dev/null \
    || { as_owner tail -n 20 "${PG_HOME}/pg.log"; die "Postgres failed to start"; }
}

cmd_up() {
  ensure_owner
  ensure_pgvector
  install_fake_extensions
  init_cluster
  start_cluster
  log "ready — ${DB_URL}"
}

# --- data steps -------------------------------------------------------------

cmd_reset() {
  cmd_up
  log "recreating database '${DBNAME}'"
  "${PGBIN}/psql" "postgresql://postgres@127.0.0.1:${PGPORT}/postgres" -v ON_ERROR_STOP=1 -q \
    -c "drop database if exists ${DBNAME} with (force)" -c "create database ${DBNAME}"
  log "bootstrap (Supabase baseline shim)"
  PSQL -q -f "${REPO_ROOT}/supabase/dev-native/bootstrap.sql"
  log "applying schemas/base.sql"
  PSQL -q -f "${REPO_ROOT}/supabase/schemas/base.sql"
  log "loading seeds"
  local f
  for f in $(ls "${REPO_ROOT}"/supabase/seeds/*.sql | sort); do
    PSQL -q -f "${f}" && printf '   ok %s\n' "$(basename "${f}")"
  done
  log "reset complete — $(PSQL -tAc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'") public tables, $(PSQL -tAc 'select count(*) from phrase') phrases"
}

cmd_apply() {
  [ "$#" -gt 0 ] || die "apply needs at least one migration file"
  start_cluster
  local f
  for f in "$@"; do
    [ -f "${f}" ] || die "no such file: ${f}"
    log "applying $(basename "${f}")"
    PSQL -q -f "${f}"
    printf '   ok %s\n' "$(basename "${f}")"
  done
  log "all migrations applied cleanly"
}

cmd_dump() {
  start_cluster
  local out="${1:-${REPO_ROOT}/supabase/schemas/base.sql}"
  # NOTE: `supabase db dump` runs pg_dump inside the pinned supabase/postgres Docker
  # image, so it can't run here. We use the on-box pg_dump instead. The object
  # inventory matches `supabase db dump`, but formatting/ordering differ — run the
  # repo's SQL formatter afterwards and review the diff (as the DB workflow already says).
  log "dumping schema via pg_dump -> ${out}"
  "${PGBIN}/pg_dump" "${DB_URL}" --schema-only --schema=public --quote-all-identifiers --no-owner --no-privileges > "${out}"
  log "wrote ${out} — format it (prettier/oxfmt) and review the diff before committing"
}

# postgres-meta is the same generator `supabase gen types` runs; the standalone npm
# build works without Docker. Kept in a gitignored scratch dir under supabase/dev-native.
TYPEGEN_DIR="${REPO_ROOT}/supabase/dev-native/.typegen"
TYPEGEN_PKG="@gregnr/postgres-meta"

ensure_typegen() {
  [ -x "${TYPEGEN_DIR}/node_modules/${TYPEGEN_PKG}/dist/server/server.js" ] && return
  log "installing ${TYPEGEN_PKG} (dockerless type generator) into ${TYPEGEN_DIR}"
  mkdir -p "${TYPEGEN_DIR}"
  printf '{ "name": "sunlo-typegen", "private": true, "type": "module" }\n' > "${TYPEGEN_DIR}/package.json"
  ( cd "${TYPEGEN_DIR}" && pnpm add "${TYPEGEN_PKG}" >/dev/null 2>&1 ) || die "failed to install ${TYPEGEN_PKG}"
}

cmd_types() {
  start_cluster
  ensure_typegen
  local out="${1:-${REPO_ROOT}/src/types/supabase.ts}"
  log "generating types via postgres-meta (no Docker) -> ${out}"
  PG_META_DB_URL="${DB_URL}" \
  PG_META_GENERATE_TYPES=typescript \
  PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS=public \
  PG_META_GENERATE_TYPES_DETECT_ONE_TO_ONE_RELATIONSHIPS=true \
    node "${TYPEGEN_DIR}/node_modules/${TYPEGEN_PKG}/dist/server/server.js" > "${out}"
  log "wrote ${out} — format it (oxfmt) and review the diff (generator version may differ slightly from supabase gen types)"
}

cmd_psql()   { start_cluster; "${PGBIN}/psql" "${DB_URL}" "$@"; }
cmd_status() {
  if as_owner "${PGBIN}/pg_ctl" -D "${PGDATA}" status >/dev/null 2>&1; then
    echo "Postgres: running   ${DB_URL}"
  else
    echo "Postgres: stopped"
  fi
}
cmd_stop()   { as_owner "${PGBIN}/pg_ctl" -D "${PGDATA}" -m fast stop >/dev/null 2>&1 && log "stopped" || log "not running"; }

# --- dispatch ---------------------------------------------------------------
cmd="${1:-}"; shift || true
case "${cmd}" in
  up)     cmd_up "$@" ;;
  reset)  cmd_reset "$@" ;;
  apply)  cmd_apply "$@" ;;
  dump)   cmd_dump "$@" ;;
  types)  cmd_types "$@" ;;
  psql)   cmd_psql "$@" ;;
  status) cmd_status "$@" ;;
  stop)   cmd_stop "$@" ;;
  *) sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; [ -n "${cmd}" ] && die "unknown command: ${cmd}" || exit 0 ;;
esac
