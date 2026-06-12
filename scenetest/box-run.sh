#!/usr/bin/env bash
set -euo pipefail

# Runs one batch of scenes against the app the pipeline already built and
# served (vite preview on :5173 — the port scenetest/config.ts targets, so no
# --base-url is needed here). Invoked by scenetest-cloud per run with:
#   SCENETEST_RUN_ID       id of this batch
#   SCENETEST_SUBSET       JSON array of scene ids; empty/unset = run all
#   SCENETEST_LOCAL_INGEST local HTTP endpoint that relays events to the dashboard

# Run the scenes. The ${VAR:+...} guard omits --subset entirely on a full run,
# so the flag is only ever passed when the cloud asked for a specific subset.
pnpm exec scenetest --no-panel \
	${SCENETEST_SUBSET:+--subset "$SCENETEST_SUBSET"}

# Relay the run's event log to the dashboard. Honest caveat: this is the
# roughest edge of onboarding today — until the scenes CLI grows a first-class
# report-URL flag, the script bridges the CLI's per-run JSONL event log to the
# local ingest, which forwards each event on. A non-zero exit (here or above)
# marks the run failed, so no batch is left dangling.
jq -c '{events: [{payload: .}]}' .scenetest/runs/latest.jsonl | while read -r batch; do
	curl -s -X POST "$SCENETEST_LOCAL_INGEST/events/$SCENETEST_RUN_ID" \
		-H 'content-type: application/json' -d "$batch" >/dev/null
done
