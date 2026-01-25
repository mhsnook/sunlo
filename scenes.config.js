import { defineConfig } from '@scenetest/cli'

export default defineConfig({
	baseUrl: 'http://localhost:5173',
	scenes: './scenetest',

	// Define test users/actors
	casts: [
		{ user: { id: 'user-1', username: 'alice' } },
		{ user: { id: 'user-2', username: 'bob' } },
	],

	headed: true, // Show browser window
	timeout: 30000, // Scene timeout
	actionTimeout: 5000, // Per-action timeout
})
