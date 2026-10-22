// A secret, set with `wrangler secret put`, so `wrangler types` only knows it
// when .dev.vars holds it. Merges into the generated Env.
interface Env {
	ADMIN_DATABASE_URL: string
}
