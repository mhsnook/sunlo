#!/usr/bin/env node
// The scenetest CLI (as of @scenetest/scenes@0.8.1) never exits non-zero on
// scene or assertion failures — only on thrown errors. That made our CI step
// report success even when scenes failed. This wrapper runs the real CLI,
// then inspects the JSON report it wrote and exits non-zero if anything
// didn't complete cleanly. Remove this once scenetest honours failures in
// its own exit code.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const reportDir = path.resolve(__dirname, '.reports')
const cli = path.resolve(
	__dirname,
	'..',
	'node_modules',
	'@scenetest',
	'scenes',
	'dist',
	'cli.js'
)

const rawArgs = process.argv.slice(2)
const subcommand = rawArgs[0]
const isSubcommand = subcommand === 'init' || subcommand === 'prompt'
const isUiMode = rawArgs.includes('--ui')
const isInfoFlag = rawArgs.some(
	(a) => a === '--help' || a === '-h' || a === '--version' || a === '-V'
)
const shouldVerifyReport = !isSubcommand && !isUiMode && !isInfoFlag

let childArgs = rawArgs
if (shouldVerifyReport) {
	const hasFormat = rawArgs.some(
		(a) => a === '--format' || a.startsWith('--format=')
	)
	if (!hasFormat) childArgs = [...rawArgs, '--format', 'both']
}

const existingReports = new Set(
	fs.existsSync(reportDir) ? fs.readdirSync(reportDir) : []
)

const child = spawn(process.execPath, [cli, ...childArgs], {
	stdio: 'inherit',
})

child.on('error', (err) => {
	console.error('Failed to run scenetest:', err)
	process.exit(1)
})

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal)
		return
	}
	const cliExit = code ?? 1
	if (!shouldVerifyReport || cliExit !== 0) {
		process.exit(cliExit)
		return
	}

	const newJsonReports = fs.existsSync(reportDir)
		? fs
				.readdirSync(reportDir)
				.filter((f) => f.endsWith('.json') && !existingReports.has(f))
				.toSorted()
		: []

	if (newJsonReports.length === 0) {
		console.error(
			'\n❌ scenetest produced no JSON report — cannot verify pass/fail'
		)
		process.exit(1)
		return
	}

	let hasFailure = false
	for (const file of newJsonReports) {
		const report = JSON.parse(
			fs.readFileSync(path.join(reportDir, file), 'utf8')
		)
		const { scenes, completed, failed, assertions } = report.summary
		const notCompleted = scenes - completed
		if (failed > 0 || notCompleted > 0 || assertions.failed > 0) {
			hasFailure = true
			console.error(
				`\n❌ ${file}: ${failed} scene(s) failed, ${notCompleted} not completed, ${assertions.failed} assertion(s) failed`
			)
		}
	}

	process.exit(hasFailure ? 1 : 0)
})
