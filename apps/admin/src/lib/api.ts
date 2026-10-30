import { accessToken, signOutHere } from './session'

// The admin Worker (apps/admin/worker) answers /api on this origin. It checks
// the token and the admin_user table itself. A JSON body goes as `json`; any
// other body, such as a recording, as `body` with its own type.
export async function adminRequest(
	path: string,
	init: { method?: string; json?: unknown; body?: Blob } = {}
) {
	const contentType =
		init.json !== undefined ? 'application/json' : init.body?.type
	const res = await fetch(`/api/${path}`, {
		method: init.method,
		body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
		headers: {
			authorization: `Bearer ${await accessToken()}`,
			...(contentType ? { 'content-type': contentType } : {}),
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
	return res
}

export const adminFetch = async (
	path: string,
	init: { method?: string; json?: unknown; body?: Blob } = {}
) => (await adminRequest(path, init)).json() as Promise<unknown>
