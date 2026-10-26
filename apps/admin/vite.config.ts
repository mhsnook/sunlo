import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { flue, flueWorkerConfig } from '@flue/vite'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
	plugins: [
		flue({ providers: ['cloudflare'] }),
		cloudflare({
			config: flueWorkerConfig(),
			// The AI binding always runs remotely, which needs `wrangler login`.
			// ADMIN_REMOTE_BINDINGS=false starts without it: the crew room
			// works, but CLEF and every agent run fail.
			remoteBindings: process.env.ADMIN_REMOTE_BINDINGS !== 'false',
		}),
		tailwindcss(),
		tanstackRouter({ autoCodeSplitting: true }),
		react(),
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
