import supabase from '@/lib/supabase-client'
import { mockCoachStep } from './mock'
import {
	CoachResponseSchema,
	type CoachRequest,
	type CoachResponse,
} from './protocol'

const USE_MOCK =
	import.meta.env.VITE_COACH_USE_MOCK === 'true' ||
	import.meta.env.MODE === 'test'

export async function coachStep(body: CoachRequest): Promise<CoachResponse> {
	if (USE_MOCK) return mockCoachStep(body)

	const { data } = await supabase.auth.getSession()
	const res = await fetch('/api/coach', {
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
			typeof reason === 'string'
				? reason
				: `The coach didn't answer (${res.status})`
		)
	}
	return CoachResponseSchema.parse(json)
}
