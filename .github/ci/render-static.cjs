'use strict'

// Turn two directories of collected static-check output into markdown
// fragments plus a gate sidecar. Section order comes from the numeric filename
// prefix, so fragments render consistently whatever order the jobs finish in.

const fs = require('fs')
const path = require('path')
const {
	parsers,
	differential,
	readLines,
	countSummary,
	listBlock,
	byExtension,
} = require('./delta.cjs')

// How many issues to print before collapsing to "… and N more". GitHub rejects
// a comment body over 65,536 characters, and one mechanical refactor will find
// that limit. The inline lint section already capped at 50; the typecheck
// section did not, and now does.
const CAP = 50

module.exports = function render({ head, base, out }) {
	fs.mkdirSync(out, { recursive: true })
	const write = (name, markdown, gate) => {
		fs.writeFileSync(path.join(out, `${name}.md`), markdown)
		fs.writeFileSync(
			path.join(out, `${name}.json`),
			JSON.stringify(gate, null, 2)
		)
	}

	// A whole tree's output directory is absent when that job died before the
	// static checks ran. Diffing nothing against nothing renders "no change",
	// which is the most dangerous thing this report can say, so name the tree
	// that is missing and let the gate fail all three checks.
	const missingTree = !fs.existsSync(head)
		? 'The PR'
		: !fs.existsSync(base)
			? 'The base branch'
			: null
	if (missingTree) {
		for (const [name, check, title] of [
			['10-typecheck', 'typecheck', 'Type errors'],
			['20-lint', 'lint', 'Lint'],
			['30-format', 'format', 'Formatter drift'],
		]) {
			write(
				name,
				`#### ${title}\n\n⚠️ ${missingTree} job produced no measurement, so there is nothing to compare. Check the job log.`,
				{ check, missing: true }
			)
		}
		return
	}

	// ── Type errors ──────────────────────────────────────────────────────
	const tc = differential(
		readLines(`${base}/typecheck.txt`),
		readLines(`${head}/typecheck.txt`),
		parsers.tsc
	)
	write(
		'10-typecheck',
		[
			'#### Type errors',
			'',
			countSummary(tc, 'error(s)'),
			listBlock('New', tc.added, CAP),
			listBlock('Resolved', tc.resolved, CAP),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{
			check: 'typecheck',
			new: tc.added.length,
			resolved: tc.resolved.length,
			total: tc.head,
		}
	)

	// ── Lint ─────────────────────────────────────────────────────────────
	const lint = differential(
		readLines(`${base}/lint.txt`),
		readLines(`${head}/lint.txt`),
		parsers.unix
	)
	write(
		'20-lint',
		[
			'#### Lint',
			'',
			countSummary(lint, 'issue(s)'),
			listBlock('New', lint.added, CAP),
			listBlock('Resolved', lint.resolved, CAP),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{
			check: 'lint',
			new: lint.added.length,
			resolved: lint.resolved.length,
			total: lint.head,
		}
	)

	// ── Formatter drift ──────────────────────────────────────────────────
	// The unit is the file, not the line, so shift-pairing is switched off.
	const headFiles = readLines(`${head}/format.txt`)
	const fmt = differential(
		readLines(`${base}/format.txt`),
		headFiles,
		parsers.file,
		0
	)
	const ext = byExtension(headFiles)

	// The blocking half. Totals and the trend are context; what fails the build
	// is a file this PR touched that the formatter would still rewrite —
	// whether that drift is new or was there all along. Both lists are
	// repo-root-relative and sorted, so a plain Set intersection is enough.
	//
	// An absent touched.txt is NOT an empty PR. It means the workflow step that
	// writes it did not run, so record that and let the gate refuse to pass.
	const touchedKnown = fs.existsSync(`${head}/touched.txt`)
	const touched = new Set(readLines(`${head}/touched.txt`))
	const dirtyTouched = headFiles.filter((f) => touched.has(f))
	const elsewhere = fmt.added.filter((e) => !touched.has(e.file))

	write(
		'30-format',
		[
			'#### Formatter drift',
			'',
			dirtyTouched.length
				? `❌ **${dirtyTouched.length} file(s) this PR touches are not formatted.** Run the formatter and commit — a file you edited ships clean, no exceptions.`
				: touchedKnown
					? '✅ Every file this PR touches is formatted.'
					: '⚠️ No list of touched files was produced, so the touched-file gate could not run.',
			listBlock('Touched and unformatted', dirtyTouched, CAP),
			'',
			'Repo-wide drift below is **context, not a gate** — debt to drive toward **0** by reformatting legacy files as you touch them.',
			'',
			countSummary(fmt, 'file(s)', { showTrend: true }),
			ext.length
				? '\n**By type:** ' + ext.map(([e, n]) => `\`${e}\` ${n}`).join(' · ')
				: null,
			listBlock('Newly unformatted elsewhere', elsewhere, CAP),
			listBlock('Reformatted', fmt.resolved, CAP),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{
			check: 'format',
			new: fmt.added.length,
			resolved: fmt.resolved.length,
			total: fmt.head,
			touched: dirtyTouched.length,
			touchedKnown,
		}
	)
}
