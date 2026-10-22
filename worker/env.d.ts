// scripts/cf-deploy.sh passes these with --var; `pnpm worker:dev` reads
// them from .dev.vars. They are not in wrangler.jsonc, so `wrangler types`
// does not generate them.
interface Env {
	SUPABASE_URL: string
	SUPABASE_ANON_KEY: string
}
