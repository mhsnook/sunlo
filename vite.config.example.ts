import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { overpassVite as overpass } from '@overpass/vite-plugin'

// EXAMPLE: How to use the strip-test-code plugin
// Uncomment the lines below to enable it:

// import { stripTestCode } from './vite-plugin-strip-test-code'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		overpass({
			enabled: process.env.NODE_ENV === 'production',
			verbose: true, // Set to true to see what's being stripped
		}),

		tsconfigPaths(),
		tanstackRouter({
			autoCodeSplitting: true,
		}),
		react(),
	],
})
