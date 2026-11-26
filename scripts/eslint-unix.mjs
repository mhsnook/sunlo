#!/usr/bin/env node
//
// Reads `eslint -f json` on stdin and prints one unix-style line per issue,
// the shape `oxlint -f unix` prints:
//
//   path:line:column: message [Error/rule-id]
//
// ESLint 9 dropped its own unix formatter from core. Paths are relative to
// the working directory, so two checkouts at different paths print the same
// lines. If stdin holds no JSON, ESLint did not run, and the script exits 1
// rather than printing an empty list that reads as zero issues.

import { relative } from 'node:path'

let input = ''
for await (const chunk of process.stdin) input += chunk

let results
try {
	results = JSON.parse(input)
} catch {
	console.error('eslint-unix: ESLint printed no JSON report')
	process.exit(1)
}

for (const file of results) {
	const path = relative(process.cwd(), file.filePath)
	for (const m of file.messages) {
		const severity = m.severity === 2 ? 'Error' : 'Warning'
		const message = m.message.replace(/\s+/g, ' ')
		console.log(
			`${path}:${m.line ?? 0}:${m.column ?? 0}: ${message} [${severity}/${m.ruleId ?? 'eslint'}]`
		)
	}
}
