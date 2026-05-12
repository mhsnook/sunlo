import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import scenetest from '@scenetest/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'

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
			visualizer({
				filename: 'dist/stats.html',
				template: 'treemap',
				gzipSize: true,
				brotliSize: true,
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
