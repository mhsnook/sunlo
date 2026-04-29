import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import scenetest from '@scenetest/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import process from 'node:process'

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		plugins: [
			scenetest(),
			tsconfigPaths(),
			tailwindcss(),
			tanstackRouter({
				autoCodeSplitting: true,
			}),
			react({
				babel: {
					plugins: ['babel-plugin-react-compiler'],
				},
			}),
			process.env.ANALYZE === 'true' &&
				visualizer({
					filename: 'dist/stats.json',
					gzipSize: true,
					brotliSize: true,
					template: 'raw-data',
				}),
		],
		build: {
			chunkSizeWarningLimit: 750,
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
				],
			},
		},
		test: {
			include: ['src/**/*.test.ts'],
		},
	}
})
