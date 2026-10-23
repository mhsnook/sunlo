import postgres from 'postgres'

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

// Local Supabase speaks plain TCP; everything else must use TLS.
export function sslFor(url: string) {
	return localHosts.has(new URL(url).hostname) ? false : 'require'
}

// One connection per request, through Supabase's transaction pooler, which
// rejects named prepared statements. The caller ends it.
export function connect(url: string) {
	return postgres(url, {
		max: 1,
		prepare: false,
		fetch_types: false,
		connect_timeout: 10,
		ssl: sslFor(url),
	})
}
