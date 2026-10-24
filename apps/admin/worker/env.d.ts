// Secrets, set with `wrangler secret put`, so `wrangler types` only knows
// them when .dev.vars holds them. Merges into the generated Env.
interface Env {
	ADMIN_DATABASE_URL: string
	GITHUB_APP_ID?: string
	GITHUB_APP_INSTALLATION_ID?: string
	GITHUB_APP_PRIVATE_KEY?: string
}
