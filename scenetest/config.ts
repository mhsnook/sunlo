import { defineConfig } from '@scenetest/cli'

export default defineConfig({
	baseUrl: 'http://localhost:5173',
	scenes: './scenetest/scenes',
	headed: true, // Show browser window
	timeout: 30000, // Scene timeout
	actionTimeout: 5000, // Per-action timeout
})
