import { queryOptions } from '@tanstack/react-query'
import { FeedbackListSchema } from '../../shared/feedback'
import { z } from 'zod'
import { adminFetch } from './api'

export const feedbackQuery = (open: boolean) =>
	queryOptions({
		queryKey: ['admin', 'feedback', open],
		queryFn: async () =>
			FeedbackListSchema.parse(
				await adminFetch(open ? 'feedback?open=1' : 'feedback')
			),
	})

export const startTriage = async () =>
	z
		.object({ count: z.number() })
		.parse(await adminFetch('feedback/triage', { method: 'POST' })).count
