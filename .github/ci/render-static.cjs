'use strict'

// Turn two directories of collect-static.sh output into markdown fragments
// plus gate sidecars.

const fs = require('fs')
const {
	parsers,
	differential,
	readLines,
	writeFragment,
	writeMissing,
	countSummary,
	listBlock,
	byExtension,
} = require('./delta.cjs')

const CHECKS = [
	{
		name: '10-typecheck',
		check: 'typecheck',
		title: 'Type errors',
		parse: parsers.tsc,
		noun: 'error(s)',
	},
	{
		name: '20-lint',
		check: 'lint',
		title: 'Lint',
		parse: parsers.unix,
		noun: 'issue(s)',
	},
	{ name: '30-format', check: 'format', title: 'Formatter drift' },
]

module.exports = function render({ head, base, out }) {
	// A whole tree's output directory is absent when that job died before the
	// static checks ran. Diffing nothing against nothing renders "no change",
	// which is the most dangerous thing this report can say.
	const missingTree = !fs.existsSync(head)
		? 'The PR'
		: !fs.existsSync(base)
			? 'The base branch'
			: null
	if (missingTree) {
		for (const c of CHECKS)
			writeMissing(
				out,
				c.name,
				c.title,
				c.check,
				`${missingTree} job produced no measurement, so there is nothing to compare.`
			)
		return
	}

	// A tool that did not run in either tree leaves nothing to compare.
	const didNotRun = (check) =>
		[
			[head, 'PR'],
			[base, 'base branch'],
		].flatMap(([dir, tree]) =>
			readLines(`${dir}/did-not-run.txt`)
				.filter((l) => l.startsWith(`${check}: `))
				.map((l) => `${tree}: ${l}`)
		)

	for (const c of CHECKS) {
		const broken = didNotRun(c.check)
		if (broken.length) {
			writeMissing(
				out,
				c.name,
				c.title,
				c.check,
				`A tool did not run, so this check measured nothing:\n\n${broken.map((l) => `- ${l}`).join('\n')}`
			)
			continue
		}
		if (c.check === 'format') renderFormat(c, head, base, out)
		else {
			const d = differential(
				readLines(`${base}/${c.check}.txt`),
				readLines(`${head}/${c.check}.txt`),
				c.parse
			)
			writeFragment(
				out,
				c.name,
				[
					`#### ${c.title}`,
					'',
					countSummary(d, c.noun),
					listBlock('New', d.added),
					listBlock('Resolved', d.resolved),
				]
					.filter((l) => l !== null)
					.join('\n'),
				{ check: c.check, new: d.added.length }
			)
		}
	}
}

function renderFormat(c, head, base, out) {
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

	writeFragment(
		out,
		c.name,
		[
			`#### ${c.title}`,
			'',
			dirtyTouched.length
				? `❌ **${dirtyTouched.length} file(s) this PR touches are not formatted.** Run \`pnpm format\` and commit — a file you edited ships formatted, whatever state it was in before.`
				: touchedKnown
					? '✅ Every file this PR touches is formatted.'
					: '⚠️ No list of touched files was produced, so the touched-file gate could not run.',
			listBlock('Touched and unformatted', dirtyTouched),
			'',
			'Repo-wide drift below is **context, not a gate** — debt to drive toward **0** by reformatting legacy files as you touch them.',
			'',
			countSummary(fmt, 'file(s)', { showTrend: true }),
			ext.length
				? '\n**By type:** ' + ext.map(([e, n]) => `\`${e}\` ${n}`).join(' · ')
				: null,
			listBlock('Newly unformatted elsewhere', elsewhere),
			listBlock('Reformatted', fmt.resolved),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{ check: c.check, touched: dirtyTouched.length, touchedKnown }
	)
}
