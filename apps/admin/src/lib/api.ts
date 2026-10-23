import { getSession } from './session'

// The admin Worker (apps/admin/worker) answers /api on this origin. It checks
// the token and the admin_user table itself.
export async function adminFetch(path: string, init: RequestInit = {}) {
	const session = await getSession()
	const res = await fetch(`/api/${path}`, {
		...init,
		headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
	})
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string
		} | null
		throw new Error(body?.error ?? `The admin request failed (${res.status})`)
	}
	return res.json() as Promise<unknown>
}
