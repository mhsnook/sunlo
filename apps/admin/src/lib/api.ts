import { accessToken, signOutHere } from './session'

// The admin Worker (apps/admin/worker) answers /api on this origin. It checks
// the token and the admin_user table itself.
export async function adminFetch(
	path: string,
	init: { method?: string; json?: unknown } = {}
) {
	const res = await fetch(`/api/${path}`, {
		method: init.method,
		body: init.json === undefined ? undefined : JSON.stringify(init.json),
		headers: {
			authorization: `Bearer ${await accessToken()}`,
			...(init.json === undefined
				? {}
				: { 'content-type': 'application/json' }),
		},
	})
	// The Worker asks the auth server, which can end a session that this
	// browser still holds. Signing out here sends the admin to /login.
	if (res.status === 401) await signOutHere()
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string
		} | null
		throw new Error(body?.error ?? `The admin request failed (${res.status})`)
	}
	return res.json() as Promise<unknown>
}
