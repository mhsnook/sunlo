import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { cloudflare, type WorkerConfig } from '@cloudflare/vite-plugin'
import { flue, flueWorkerConfig } from '@flue/vite'
import { unstable_readConfig } from 'wrangler'
import { z } from 'zod'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

const SupabaseVars = z.object({
	SUPABASE_URL: z.string().url(),
	SUPABASE_ANON_KEY: z.string().min(1),
})
const WranglerVars = z.object({
	vars: SupabaseVars,
	previews: z.object({ vars: SupabaseVars }).optional(),
})

// On Workers Builds (WORKERS_CI=1) the app takes its Supabase project from
// wrangler.jsonc, the values the Worker runs with: `vars` on main, and
// `previews.vars` on any other branch. So the app and its Worker cannot
// disagree, and the dashboard needs no build variables. A local build still
// reads the root .env; process.env set here wins over .env files.
if (process.env.WORKERS_CI) {
	const config = WranglerVars.parse(
		unstable_readConfig({
			config: fileURLToPath(new URL('wrangler.jsonc', import.meta.url)),
		})
	)
	const vars =
		process.env.WORKERS_CI_BRANCH === 'main'
			? config.vars
			: (config.previews?.vars ?? config.vars)
	process.env.VITE_SUPABASE_URL = vars.SUPABASE_URL
	process.env.VITE_SUPABASE_ANON_KEY = vars.SUPABASE_ANON_KEY
}

// Flue adds a Durable Object binding per agent (FLUE_RIKER_AGENT, ...) to
// the top-level config only, and `previews` inherits nothing, so without
// this a preview's agent routes answer route_not_found.
function withPreviewBindings(flueConfig: (config: WorkerConfig) => void) {
	return (config: WorkerConfig) => {
		flueConfig(config)
		if (!config.previews) return
		const own = config.previews.durable_objects?.bindings ?? []
		const names = new Set(own.map((binding) => binding.name))
		config.previews.durable_objects = {
			...config.previews.durable_objects,
			bindings: [
				...own,
				...(config.durable_objects?.bindings ?? []).filter(
					(binding) => !names.has(binding.name)
				),
			],
		}
	}
}

// The crew room reads this file to see which commit is live (worker/crew/
// github-log.ts, liveCommit). Workers Builds sets WORKERS_CI_COMMIT_SHA.
const versionFile: Plugin = {
	name: 'sunlo-version-file',
	apply: 'build',
	applyToEnvironment: (environment) => environment.name === 'client',
	generateBundle() {
		this.emitFile({
			type: 'asset',
			fileName: 'version.json',
			source: JSON.stringify({
				commit: process.env.WORKERS_CI_COMMIT_SHA ?? null,
			}),
		})
	},
}

export default defineConfig({
	plugins: [
		versionFile,
		flue({ providers: ['cloudflare'] }),
		cloudflare({
			config: withPreviewBindings(flueWorkerConfig()),
			// The AI binding always runs remotely, which needs `wrangler login`.
			// ADMIN_REMOTE_BINDINGS=false starts without it: the crew room
			// works, but CLEF and every agent run fail.
			remoteBindings: process.env.ADMIN_REMOTE_BINDINGS !== 'false',
		}),
		tailwindcss(),
		tanstackRouter({ autoCodeSplitting: true }),
		react(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	// The shared .env at the repo root. Missing VITE_SUPABASE_* vars don't fail
	// the build; they silently drop the Supabase SDK (see docs/deployment.md).
	envDir: repoRoot,
	resolve: {
		tsconfigPaths: true,
		// Shared modules under the root src/ import these from the root
		// node_modules; dedupe keeps one copy of each in the bundle.
		dedupe: ['react', 'react-dom', '@tanstack/react-query', 'recharts'],
	},
	server: {
		port: 5174,
		strictPort: true,
		fs: { allow: [repoRoot] },
	},
})
