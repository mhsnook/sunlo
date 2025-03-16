import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
	build: {
		chunkSizeWarningLimit: 550, // Tauri uses Chromium on Windows and WebKit on macOS and Linux
		target:
			process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
		// don't minify for debug builds
		minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
	},
	envPrefix: ['VITE_', 'TAURI_ENV_'],
	server: {
		host: mode === 'development' ? 'localhost' : false,
		port: 5173,
		strictPort: true,
		hmr:
			mode === 'development' ?
				{
					protocol: 'ws',
					host: 'localhost',
					port: 5173,
				}
			:	undefined,
		watch: {
			// tell vite to ignore watching `src-tauri`
			ignored: ['**/src-tauri/**'],
		},
	},
}))
