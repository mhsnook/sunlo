import { queryOptions } from '@tanstack/react-query'
import { FeedbackListSchema } from '../../shared/feedback'
import { adminFetch, adminRequest } from './api'

export const feedbackQuery = (open: boolean) =>
	queryOptions({
		queryKey: ['admin', 'feedback', open],
		queryFn: async () =>
			FeedbackListSchema.parse(
				await adminFetch(open ? 'feedback?open=1' : 'feedback')
			),
	})

export const startTriage = () =>
	adminRequest('feedback/triage', { method: 'POST' })
