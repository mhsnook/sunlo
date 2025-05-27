import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const ReactCompilerConfig = {}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	return {
		plugins: [
			react({
				babel: {
					plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
				},
			}),
			tsconfigPaths(),
			TanStackRouterVite(),
		],
		build: {
			chunkSizeWarningLimit: 550,
			// Tauri uses Chromium on Windows and WebKit on macOS and Linux
			target:
				process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
			// don't minify for debug builds
			minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
			// produce sourcemaps for debug builds
			sourcemap: !!process.env.TAURI_ENV_DEBUG,
		},
		envPrefix: ['VITE_', 'TAURI_ENV_'],
		server: {
			host: mode === 'development' ? '0.0.0.0' : false,
			port: 5173,
			strictPort: true,
			hmr:
				mode === 'development' ?
					{
						protocol: 'ws',
						host: '0.0.0.0',
						port: 5173,
					}
				:	undefined,
			watch: {
				// tell vite to ignore watching `src-tauri`
				ignored: ['**/src-tauri/**', '**/supabase/**'],
			},
		},
	}
})
