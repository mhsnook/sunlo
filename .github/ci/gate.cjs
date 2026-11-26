'use strict'

// The one place the pass/fail policy lives.
//
// Reporting and gating are deliberately separate: the comment always posts, so
// a contributor can see the full picture even on a red build. This step then
// decides, from the same numbers, whether the build should fail.
//
// Every sidecar has `check`, and either `missing: true` or the fields its rule
// reads:
//   'report-only'    never fails — the comment is the whole point
//   'no-new'         fails when `new` > 0, with `why` as the reason if given
//   'touched-clean'  fails when `touched` > 0: a file this PR edited still has
//                    issues, whether they are new or were there before. A
//                    delta rule would pass a file that was already dirty,
//                    because it appears in both trees and cancels out.

const fs = require('fs')
const path = require('path')
const { listFiles } = require('./delta.cjs')

const POLICY = {
	build: 'no-new',
	typecheck: 'no-new',
	lint: 'no-new',
	format: 'touched-clean',
	tests: 'no-new',
	scan: 'no-new',
	bundle: 'report-only',
}

// A check whose job died before it wrote a sidecar reported nothing at all.
// Without this list, a crashed job passes the gate.
const REQUIRED = Object.keys(POLICY).filter((c) => POLICY[c] !== 'report-only')

function verdict(data) {
	const rule = POLICY[data.check] ?? 'report-only'
	if (rule === 'report-only') return null

	// A step that produced no measurement did not pass — it crashed. Treat the
	// absence as a failure, or a broken tool reads as "no change" and merges.
	if (data.missing)
		return 'the step produced no measurement (crashed or was skipped)'

	if (rule === 'touched-clean') {
		if (!data.touchedKnown)
			return 'no list of touched files was produced, so the touched-file gate could not run'
		return data.touched > 0
			? `${data.touched} touched file(s) still have issues — run the formatter on the files you edited`
			: null
	}

	return data.new > 0 ? (data.why ?? `${data.new} new issue(s)`) : null
}

function main(dir) {
	if (!fs.existsSync(dir)) {
		console.error(
			`No fragments at ${dir} — every check job failed before reporting.`
		)
		process.exit(1)
	}

	const failures = []
	const seen = new Set()
	for (const f of listFiles(dir, '.json')) {
		const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
		seen.add(data.check)
		const reason = verdict(data)
		if (reason) failures.push(`${data.check}: ${reason}`)
		else if ((POLICY[data.check] ?? 'report-only') === 'report-only')
			console.log(`➖ ${data.check} (report only, not gated)`)
		else console.log(`✅ ${data.check}`)
	}

	for (const check of REQUIRED) {
		if (!seen.has(check))
			failures.push(`${check}: no report was produced at all`)
	}

	if (!failures.length) {
		console.log('\nAll gated checks passed.')
		return
	}
	console.error('\nBlocking:')
	for (const f of failures) console.error(`  ❌ ${f}`)
	console.error(
		'\nSee the "### PR checks" comment on the pull request for detail.'
	)
	process.exit(1)
}

main(process.argv[2] ?? '/tmp/fragments')
