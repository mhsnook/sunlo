import process from 'node:process'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import scenetest from '@scenetest/vite-plugin'
import { cloudflare, type WorkerConfig } from '@cloudflare/vite-plugin'
import { flue, flueWorkerConfig } from '@flue/vite'

// The root .env holds names the Worker must not see, such as the service
// role key. Wrangler would otherwise load it as the Worker's local vars.
process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'false'

// Vitest shares this config, and the Cloudflare plugin would start workerd
// for every unit test run.
const isVitest = !!process.env.VITEST

// The scripted coach, for scenetest and for running without Workers AI.
const coachMock = process.env.VITE_COACH_USE_MOCK === 'true'

// Flue adds a Durable Object binding per agent (FLUE_COACH_AGENT) to the
// top-level config only, and `previews` inherits nothing, so without this a
// preview's coach routes answer route_not_found.
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

// The Worker: Flue's agents, and worker/ for the app's own routes.
function workerPlugins(
	command: 'serve' | 'build',
	appEnv: Record<string, string>
) {
	const fluePlugin = flue({ providers: ['cloudflare'] })
	const workerConfig = withPreviewBindings(flueWorkerConfig())
	return [
		fluePlugin,
		cloudflare({
			config: (config) => {
				workerConfig(config)
				// The dev Worker checks tokens against the Supabase project the dev
				// app signs in to, not the production one in wrangler.jsonc.
				if (command === 'serve')
					config.vars = {
						...config.vars,
						SUPABASE_URL: appEnv.VITE_SUPABASE_URL,
						SUPABASE_ANON_KEY: appEnv.VITE_SUPABASE_ANON_KEY,
					}
				if (coachMock)
					config.vars = { ...config.vars, COACH_MODEL: 'mock/coach' }
			},
			// The AI binding always runs remotely, which needs `wrangler login`.
			// SUNLO_REMOTE_BINDINGS=false (set by `pnpm dev:local`, which CI
			// runs) starts without it, and every model call fails.
			remoteBindings: process.env.SUNLO_REMOTE_BINDINGS !== 'false',
		}),
	]
}

// The admin app's crew room reads this file to see which commit is live.
// Workers Builds sets WORKERS_CI_COMMIT_SHA.
const versionFile: Plugin = {
	name: 'sunlo-version-file',
	apply: 'build',
	// The app's static files, not the Worker bundle beside them.
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

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	const appEnv = loadEnv(mode, process.cwd(), 'VITE_')
	return {
		plugins: [
			...(isVitest ? [] : workerPlugins(command, appEnv)),
			versionFile,
			scenetest(),
			tailwindcss(),
			tanstackRouter({
				autoCodeSplitting: true,
			}),
			react(),
			babel({ presets: [reactCompilerPreset()] }),
		],
		resolve: {
			tsconfigPaths: true,
		},
		// The Cloudflare plugin builds the app into dist/client and the Worker
		// into dist/sunlo. These options are for the browser bundle only.
		environments: {
			client: {
				build: {
					chunkSizeWarningLimit: 750,
					rollupOptions: {
						output: {
							// Split rarely-changing deps into their own content-hashed
							// chunks so repeat visitors keep them cached across the many
							// app-code deploys that happen between dependency bumps.
							codeSplitting: {
								groups: [
									{
										name: 'react-vendor',
										test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
									},
									{
										name: 'supabase-vendor',
										test: /[\\/]node_modules[\\/]@supabase[\\/]/,
									},
									{
										name: 'markdown-vendor',
										test: /[\\/]node_modules[\\/](react-markdown|unified|remark-[a-z-]+|rehype-[a-z-]+|micromark[a-z-]*|mdast-[a-z-]+|hast-[a-z-]+|unist-[a-z-]+|vfile[a-z-]*|property-information)[\\/]/,
									},
									{
										// every lucide icon the app actually imports, in one
										// chunk — tree-shaking still drops unused icons.
										name: 'lucide-vendor',
										test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
									},
								],
							},
						},
					},
				},
			},
		},
		envPrefix: ['VITE_'],
		server: {
			port: 5173,
			strictPort: true,
			watch: {
				ignored: [
					'**/supabase/**',
					'.oxlintrc.json',
					'**/*.md',
					'**/*.txt',
					'**/*.sql',
					'**/.prettierignore',
					'**/.vscode',
					'**/.husky',
					'**/.github',
					'**/dist',
					'**/node_modules',
					'**/scenetest/**',
					'**/.wrangler/**',
				],
			},
		},
		test: {
			include: [
				'src/**/*.test.ts',
				'worker/**/*.test.ts',
				'apps/admin/{worker,src}/**/*.test.ts',
			],
		},
	}
})
