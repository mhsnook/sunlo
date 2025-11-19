import { execSync } from 'child_process'

async function globalSetup() {
	console.log('Global Setup: Resetting Supabase Database...')
	try {
		// Reset the database to a clean state with seeds
		execSync('pnpm supabase db reset', { stdio: 'inherit' })
		console.log('Global Setup: Database reset complete.')
	} catch (error) {
		console.error('Global Setup: Failed to reset database.', error)
		throw error
	}
}

export default globalSetup
