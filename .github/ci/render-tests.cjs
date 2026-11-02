'use strict'

// Render a test-run fragment. Single-branch: a test either passes on head or
// it does not, so there is nothing to diff against base.
//
// `parse` reads the JSON that `vitest run --reporter=json` writes, which is
// the Jest shape. `pnpm test:unit` is that runner.

const fs = require('fs')
const { listBlock, writeFragment, writeMissing } = require('./delta.cjs')

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
	if (!fs.existsSync(results)) {
		writeMissing(
			out,
			'50-tests',
			'Tests',
			'tests',
			'No results file was produced — the runner probably crashed before writing output.'
		)
		return
	}

	const s = parse(fs.readFileSync(results, 'utf8'))
	const summary =
		`${s.failed ? '❌' : '✅'} ${s.passed}/${s.total} passed` +
		(s.failed ? ` · **${s.failed} failed**` : '') +
		(s.skipped ? ` · ${s.skipped} skipped` : '')
	const failures = s.failures.map((f) =>
		`✗ ${f.name}\n  ${f.file}\n  ${f.message}`.trimEnd()
	)

	writeFragment(
		out,
		'50-tests',
		['#### Tests', '', summary, listBlock('Failed', failures, CAP)]
			.filter((l) => l !== null)
			.join('\n'),
		{ check: 'tests', new: s.failed, why: `${s.failed} failing test(s)` }
	)
}
