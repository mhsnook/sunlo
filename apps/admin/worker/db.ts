import postgres, { type Sql } from 'postgres'

// One connection per request. Hyperdrive holds the pool and the TLS session
// to Supabase: the pooler's certificate comes from Supabase's private CA,
// which a Worker's own TLS socket cannot verify, and from Cloudflare's
// network that handshake hangs instead of failing. The caller ends it.
// Prepared statements stay on: Hyperdrive caches them, and its docs warn
// that `prepare: false` can make queries hang.
export function connect(hyperdrive: Hyperdrive) {
	return postgres(hyperdrive.connectionString, {
		max: 1,
		fetch_types: false,
		connect_timeout: 10,
		connection: { application_name: 'Cloudflare Hyperdrive' },
	})
}

// Rejects when `promise` has not settled after `ms`, so a connection that
// neither answers nor errors becomes a 500 instead of a request the browser
// gives up on five minutes later.
export function withDeadline<T>(
	promise: Promise<T>,
	ms: number,
	what: string
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | null = null
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error(`${what} did not answer within ${ms / 1000}s`)),
			ms
		)
	})
	return Promise.race([promise, deadline]).finally(() => {
		if (timer !== null) clearTimeout(timer)
	})
}

// One connection for the length of `run`, with a deadline on the whole run.
export async function withSql<T>(
	hyperdrive: Hyperdrive,
	ms: number,
	run: (sql: Sql) => Promise<T>
): Promise<T> {
	const sql = connect(hyperdrive)
	try {
		return await withDeadline(run(sql), ms, 'The database')
	} finally {
		await sql.end({ timeout: 5 })
	}
}
