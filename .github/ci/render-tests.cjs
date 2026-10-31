'use strict'

// Render a test-run fragment. Single-branch: a test either passes on head or
// it does not, so there is nothing to diff against base.
//
// `parse` reads the JSON that `vitest run --reporter=json` writes, which is
// the Jest shape. `pnpm test:unit` is that runner.

const fs = require('fs')
const path = require('path')

const CAP = 20

function parse(raw) {
	const r = JSON.parse(raw)
	const failures = []
	for (const file of r.testResults ?? []) {
		for (const t of file.assertionResults ?? []) {
			if (t.status !== 'failed') continue
			failures.push({
				name: [...(t.ancestorTitles ?? []), t.title].join(' › '),
				file: file.name?.replace(process.cwd() + '/', '') ?? '',
				message: (t.failureMessages ?? []).join('\n').split('\n')[0] ?? '',
			})
		}
	}
	return {
		total: r.numTotalTests ?? 0,
		passed: r.numPassedTests ?? 0,
		failed: r.numFailedTests ?? failures.length,
		skipped: r.numPendingTests ?? 0,
		failures,
	}
}

module.exports = function render({ results, out }) {
	fs.mkdirSync(out, { recursive: true })

	if (!fs.existsSync(results)) {
		fs.writeFileSync(
			path.join(out, '50-tests.md'),
			'#### Tests\n\n⚠️ No results file was produced — the runner probably crashed before writing output. Check the job log.'
		)
		// A missing report is a failure, not a pass. Say so to the gate.
		fs.writeFileSync(
			path.join(out, '50-tests.json'),
			JSON.stringify({ check: 'tests', failed: 1, missing: true }, null, 2)
		)
		return
	}

	const s = parse(fs.readFileSync(results, 'utf8'))
	const icon = s.failed ? '❌' : '✅'
	const lines = [
		'#### Tests',
		'',
		`${icon} ${s.passed}/${s.total} passed` +
			(s.failed ? ` · **${s.failed} failed**` : '') +
			(s.skipped ? ` · ${s.skipped} skipped` : ''),
	]

	if (s.failures.length) {
		const shown = s.failures.slice(0, CAP)
		const block = shown
			.map((f) => `✗ ${f.name}\n  ${f.file}\n  ${f.message}`.trimEnd())
			.join('\n\n')
		const more =
			s.failures.length > CAP ? `\n\n… and ${s.failures.length - CAP} more` : ''
		lines.push(
			'',
			`**Failed (${s.failures.length}):**`,
			'',
			'```',
			block + more,
			'```'
		)
	}

	fs.writeFileSync(path.join(out, '50-tests.md'), lines.join('\n'))
	fs.writeFileSync(
		path.join(out, '50-tests.json'),
		JSON.stringify(
			{ check: 'tests', failed: s.failed, total: s.total },
			null,
			2
		)
	)
}
