import type { SupabaseClient } from '@supabase/supabase-js'

// Augment scenetest's ServerContext so `server.supabase` is typed inside
// serverCheck() callbacks. The matching runtime value is wired up in
// scenetest/config.ts under `server.supabase`. pnpm hoists checks-react's
// nested @scenetest/checks separately from the top-level one, so augment
// both module specifiers.

declare module '@scenetest/checks' {
	interface ServerContext {
		supabase: SupabaseClient
	}
}

declare module '@scenetest/checks-react' {
	interface ServerContext {
		supabase: SupabaseClient
	}
}


