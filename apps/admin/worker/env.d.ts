// Optional secrets, set with `wrangler secret put`, so `wrangler types` only
// knows them when .dev.vars holds them. Merges into the generated Env.
interface Env {
	GITHUB_APP_ID?: string
	GITHUB_APP_INSTALLATION_ID?: string
	GITHUB_APP_PRIVATE_KEY?: string
	IMAGE_URL_SECRET?: string
}
