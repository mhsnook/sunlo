// Server-side helpers for TypeScript scenes. Scene specs run in Node, so they
// cannot import from `src/lib/utils` — that module pulls in browser-only code
// (sonner). `todayString` is duplicated here rather than imported for that
// reason; keep the 4am cutoff in sync with `src/lib/utils.ts`.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

export const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const pad = (n: number) => `0${n}`.slice(-2)

/** The review day string, using the same 4am cutoff as the app. */
export function todayString() {
	const now = new Date()
	now.setHours(now.getHours() - 4)
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Poll a predicate until it holds, or the timeout expires. */
export async function pollUntil(
	fn: () => Promise<boolean>,
	{ timeoutMs = 8000, intervalMs = 150 } = {}
): Promise<boolean> {
	const start = Date.now()
	// Sequential by design — each tick must observe the previous result.
	/* eslint-disable no-await-in-loop */
	while (Date.now() - start < timeoutMs) {
		if (await fn()) return true
		await new Promise((r) => setTimeout(r, intervalMs))
	}
	/* eslint-enable no-await-in-loop */
	return false
}

/** Delete every review artefact for one learner + language. */
export async function clearReviewSession(uid: string, lang: string) {
	await supabase
		.from('user_card_review')
		.delete()
		.eq('uid', uid)
		.eq('lang', lang)
	await supabase
		.from('user_review_session')
		.delete()
		.eq('uid', uid)
		.eq('lang', lang)
}
