#!/usr/bin/env bash
#
# supabase-cloud.sh — run the full local Supabase stack in a Claude Code cloud
# session, or anywhere the Docker CLI is installed but no daemon is running.
#
# Claude Code web sessions ship dockerd, containerd and runc but do not start a
# daemon. This script starts one when the socket is missing, fetches the
# Supabase CLI when it is not on PATH, runs `supabase start` with the same
# service exclusions CI uses, and writes the stack's keys into .env so Vite and
# scenetest/config.ts pick them up.
#
# This is the on-demand path. Do not wire it into every session: the first boot
# pulls ≈4.5 GB of images (≈3 min), a warm boot is ≈40 s. Schema-only checks
# (does a migration apply? do the seeds load?) stay on scripts/db-native.sh,
# which needs no Docker and finishes in seconds.
#
# Usage
# -----
#   scripts/supabase-cloud.sh up       # docker daemon + CLI + supabase start + .env (idempotent)
#   scripts/supabase-cloud.sh reset    # supabase db reset (migrations + seeds, ≈35 s)
#   scripts/supabase-cloud.sh status   # supabase status
#   scripts/supabase-cloud.sh stop     # supabase stop --no-backup (images stay cached)
#   scripts/supabase-cloud.sh psql     # psql into the stack's Postgres
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${SUNLO_CACHE_DIR:-${HOME}/.cache/sunlo}"
CLI_VERSION="${SUPABASE_CLI_VERSION:-latest}"
# Same exclusions as .github/workflows/test.yaml and scenetest/box-db.sh.
EXCLUDE="studio,imgproxy,logflare,vector,supavisor,edge-runtime,inbucket"
DOCKERD_LOG="${CACHE_DIR}/dockerd.log"

log() { printf '\033[36m== %s\033[0m\n' "$*" >&2; }
die() { printf '\033[31m!! %s\033[0m\n' "$*" >&2; exit 1; }

# --- docker -----------------------------------------------------------------

ensure_docker() {
	command -v docker >/dev/null || die "docker CLI not found"
	if docker info >/dev/null 2>&1; then log "docker daemon already running"; return; fi
	command -v dockerd >/dev/null || die "no docker daemon running and dockerd is not installed"
	[ "$(id -u)" = "0" ] || die "starting dockerd needs root"
	mkdir -p "${CACHE_DIR}"
	log "starting dockerd (log: ${DOCKERD_LOG})"
	# setsid + nohup: the daemon must outlive the shell that started it, or it
	# dies with the tool call and the next command finds no socket.
	setsid nohup dockerd >"${DOCKERD_LOG}" 2>&1 </dev/null &
	local i
	for i in $(seq 1 60); do
		docker info >/dev/null 2>&1 && { log "dockerd ready"; return; }
		sleep 1
	done
	tail -n 20 "${DOCKERD_LOG}" >&2
	die "dockerd did not come up within 60 s"
}

# --- supabase cli -----------------------------------------------------------

SUPABASE_BIN=""

ensure_cli() {
	if command -v supabase >/dev/null; then
		SUPABASE_BIN="$(command -v supabase)"
		log "supabase CLI $("${SUPABASE_BIN}" --version) on PATH"
		return
	fi
	SUPABASE_BIN="${CACHE_DIR}/supabase"
	if [ -x "${SUPABASE_BIN}" ]; then
		log "supabase CLI $("${SUPABASE_BIN}" --version) from cache"
		return
	fi
	mkdir -p "${CACHE_DIR}"
	local url
	if [ "${CLI_VERSION}" = "latest" ]; then
		url="https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz"
	else
		url="https://github.com/supabase/cli/releases/download/v${CLI_VERSION}/supabase_linux_amd64.tar.gz"
	fi
	log "downloading supabase CLI (${CLI_VERSION})"
	curl -sSL "${url}" | tar xz -C "${CACHE_DIR}" supabase
	log "supabase CLI $("${SUPABASE_BIN}" --version) installed to ${CACHE_DIR}"
}

sb() { (cd "${REPO_ROOT}" && "${SUPABASE_BIN}" "$@"); }

# --- .env -------------------------------------------------------------------

# Set KEY=VALUE in .env, replacing an existing line or appending. Other keys
# (OPENAI_API_KEY, Tauri secrets, …) are left alone.
set_env() {
	local key="$1" value="$2" file="${REPO_ROOT}/.env"
	touch "${file}"
	if grep -q "^${key}=" "${file}"; then
		sed -i "s|^${key}=.*|${key}=${value}|" "${file}"
	else
		printf '%s=%s\n' "${key}" "${value}" >>"${file}"
	fi
}

write_env() {
	local status
	status="$(sb status -o json)"
	set_env VITE_SUPABASE_URL "http://127.0.0.1:54321"
	set_env VITE_SUPABASE_ANON_KEY "$(echo "${status}" | jq -r '.ANON_KEY')"
	set_env SUPABASE_SERVICE_ROLE_KEY "$(echo "${status}" | jq -r '.SERVICE_ROLE_KEY')"
	log "wrote Supabase keys to .env"
}

# --- commands ---------------------------------------------------------------

cmd_up() {
	ensure_docker
	ensure_cli
	local t0; t0="$(date +%s)"
	log "supabase start -x ${EXCLUDE}"
	# `supabase start` is a no-op against a running stack, and on a fresh stack
	# it applies migrations and seeds itself, so no separate reset is needed here.
	sb start -x "${EXCLUDE}"
	write_env
	log "stack ready in $(( $(date +%s) - t0 )) s — API http://127.0.0.1:54321, DB 127.0.0.1:54322"
}

cmd_reset() {
	ensure_docker; ensure_cli
	local t0; t0="$(date +%s)"
	sb db reset
	log "reset in $(( $(date +%s) - t0 )) s"
}

cmd_status() { ensure_docker; ensure_cli; sb status; }
cmd_stop() { ensure_docker; ensure_cli; sb stop --no-backup; }
cmd_psql() { ensure_docker; psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" "$@"; }

case "${1:-}" in
	up) cmd_up ;;
	reset) cmd_reset ;;
	status) cmd_status ;;
	stop) cmd_stop ;;
	psql) shift; cmd_psql "$@" ;;
	*) sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
