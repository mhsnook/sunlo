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
