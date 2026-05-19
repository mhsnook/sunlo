import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import scenetest from '@scenetest/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		plugins: [
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
