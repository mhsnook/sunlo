// Optional secrets, set with `wrangler secret put`, so `wrangler types` only
// knows them when .dev.vars holds them. Merges into the generated Env.
interface Env {
	GITHUB_APP_ID?: string
	GITHUB_APP_INSTALLATION_ID?: string
	GITHUB_APP_PRIVATE_KEY?: string
	GITHUB_WEBHOOK_SECRET?: string
	IMAGE_URL_SECRET?: string
	// The Hyperdrive config for crew_reader, which run_sql needs. Optional
	// until its config exists in Cloudflare (README, "Deploying").
	CREW_SQL?: Hyperdrive
}
