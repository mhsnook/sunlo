import supabase from '@/lib/supabase-client'

/**
 * POSTs JSON to this app's own worker (`worker/api.ts`) with the signed-in
 * user's token, and returns the parsed body. A failed response throws with
 * the worker's `error` message, or with `fallback` and the status.
 */
export async function postWorkerApi(
	path: string,
	body: unknown,
	fallback: string
): Promise<unknown> {
	const { data } = await supabase.auth.getSession()
	const res = await fetch(path, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${data.session?.access_token ?? ''}`,
		},
		body: JSON.stringify(body),
	})
	const json: unknown = await res.json().catch(() => null)
	if (!res.ok) {
		const reason = (json as { error?: unknown } | null)?.error
		throw new Error(
			typeof reason === 'string' ? reason : `${fallback} (${res.status})`
		)
	}
	return json
}
