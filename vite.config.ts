import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	return {
		plugins: [
			tsconfigPaths(),
			TanStackRouterVite({
				autoCodeSplitting: true,
			}),
			react(),
		],
		build: {
			chunkSizeWarningLimit: 750,
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
