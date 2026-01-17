import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isTauri = !!process.env.TAURI_ENV_PLATFORM

	return {
		plugins: [
			tsconfigPaths(),
			tailwindcss(),
			tanstackStart({
				srcDirectory: 'src',
				// Enable SPA mode for Tauri (no SSR in mobile apps)
				...(isTauri && {
					spa: {
						enabled: true,
					},
				}),
			}),
			react({
				babel: {
					plugins: ['babel-plugin-react-compiler'],
				},
			}),
		],
		// Prevent vite from obscuring Rust errors
		clearScreen: false,
		build: {
			chunkSizeWarningLimit: 750,
			// Tauri uses Chromium on Windows and WebKit on macOS/Linux
			target:
				process.env.TAURI_ENV_PLATFORM === 'windows' ?
					'chrome105'
				:	'safari14',
			// Don't minify for debug builds
			minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
			// Produce sourcemaps for debug builds
			sourcemap: !!process.env.TAURI_ENV_DEBUG,
		},
		envPrefix: ['VITE_', 'TAURI_ENV_'],
		server: {
			// Use TAURI_DEV_HOST for mobile dev, otherwise use 0.0.0.0 for dev
			host: host || (mode === 'development' ? '0.0.0.0' : false),
			port: 5173,
			strictPort: true,
			hmr: host ?
					{
						protocol: 'ws',
						host,
						port: 5173,
					}
				: mode === 'development' ?
					{
						protocol: 'ws',
						host: '0.0.0.0',
						port: 5173,
					}
				:	undefined,
			watch: {
				// tell vite to ignore watching `src-tauri`
				ignored: [
					'**/src-tauri/**',
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
				],
			},
		},
	}
})
