'use strict'

// Check 0: did the build survive, and whose fault is it?
//
//   node -e "require('./.github/ci/render-build.cjs')({
//     head: '/tmp/head', base: '/tmp/base', out: '/tmp/fragments'
//   })"
//
// Both build steps run under `continue-on-error` and write two files into their
// artifact: `build.outcome` (the step outcome) and `build.log`. Reading both
// trees is what turns "the build failed" into one of four different messages.
// A PR that inherits a broken base branch should not be told it broke the
// build, and a PR that repairs one deserves to hear so.
//
// When both trees build, this writes no markdown at all. A bot that says "the
// build works" on every green PR is scroll cost.

const path = require('path')
const { stripVTControlCharacters } = require('util')
const { readText, writeFragment } = require('./delta.cjs')

// How many log lines to quote. Enough to carry one error plus its import trace.
const EXCERPT = 40

// The first line of an error in Vite's output. The excerpt is anchored on this
// rather than on the tail of the log, because Vite prints a summary, a stack,
// and an exit code after the useful part.
const ERROR_HEADING = /^\s*(error|ERROR|Error:|\[vite\]|✘|×|failed to)/

/** `success`, `failure`, `skipped`, `cancelled`, or '' when the file is absent. */
const outcome = (dir) => readText(path.join(dir, 'build.outcome')).trim()

// Only `success` counts as built. `skipped` and `cancelled` mean the tree was
// never measured, which is not the same as a clean build.
const built = (o) => o === 'success'

/**
 * Quote the part of the log a reader needs: from the first error heading, or
 * from the tail when no heading matches.
 */
function excerpt(log) {
	// Strip ANSI, so a colourised log does not render as escape codes.
	const lines = stripVTControlCharacters(log)
		.split('\n')
		.filter((l) => l.trim() !== '')
	if (!lines.length) return '_The build produced no output._'

	let start = lines.findIndex((l) => ERROR_HEADING.test(l))
	if (start === -1) start = Math.max(0, lines.length - EXCERPT)

	const shown = lines.slice(start, start + EXCERPT)
	const dropped = lines.length - start - shown.length
	return (
		'```\n' +
		shown.join('\n') +
		(dropped > 0 ? `\n… ${dropped} more line(s) in the job log` : '') +
		'\n```'
	)
}

module.exports = function render({ head, base, out }) {
	const headOutcome = outcome(head)
	const baseOutcome = outcome(base)

	// Neither job recorded an outcome: both died before the recording step.
	// Write nothing, and the gate reports `build` as missing.
	if (!headOutcome && !baseOutcome) return

	const headOk = built(headOutcome)
	const baseOk = built(baseOutcome)

	// Whose fault the failure is belongs in the comment. A broken base branch
	// still means this PR cannot be verified, so the gate blocks either way.
	let markdown = null
	let why = null
	if (headOk && !baseOk) {
		markdown = `✅ **This PR fixes the build.** The base branch does not build (\`${baseOutcome || 'no result'}\`); this tree does.`
	} else if (!headOk) {
		why = baseOk
			? 'this PR breaks the build'
			: 'neither this PR nor the base branch builds — repair the base branch first'
		const headline = baseOk
			? '❌ **This PR breaks the build.** The base branch builds and this tree does not.'
			: '❌ **Neither tree builds.** The base branch is already broken, so this PR is probably not the cause — repair the base branch first.'
		markdown = `${headline}\n\n${excerpt(readText(path.join(head, 'build.log')))}`
	}

	writeFragment(out, '05-build', markdown && `#### Build\n\n${markdown}`, {
		check: 'build',
		new: headOk ? 0 : 1,
		why,
	})
}
