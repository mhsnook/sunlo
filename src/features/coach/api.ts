import { postWorkerApi } from '@/lib/worker-api'
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

	return CoachResponseSchema.parse(
		await postWorkerApi('/api/coach', body, "The coach didn't answer")
	)
}
