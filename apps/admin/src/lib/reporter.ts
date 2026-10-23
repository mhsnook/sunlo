import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { adminFetch } from './api'

export const ReportSchema = z.object({
	id: z.string(),
	since: z.string(),
	until: z.string(),
	status: z.enum(['writing', 'done', 'failed']),
	body: z.string().nullable(),
	error: z.string().nullable(),
	created_at: z.string(),
	finished_at: z.string().nullable(),
})

export type ReportType = z.infer<typeof ReportSchema>

export const NoteSchema = z.object({
	id: z.number(),
	text: z.string(),
	created_at: z.string(),
})

export type NoteType = z.infer<typeof NoteSchema>

export async function checkIn(options: { fresh?: boolean } = {}) {
	const query = options.fresh ? '?fresh=1' : ''
	return ReportSchema.parse(
		await adminFetch(`reporter/check-in${query}`, { method: 'POST' })
	)
}

// Once per page load. The Worker hands back the report it already wrote when
// the last check-in was under 30 minutes ago, so a reload costs no model run.
export const checkInQuery = () =>
	queryOptions({
		queryKey: ['admin', 'reporter', 'check-in'],
		queryFn: () => checkIn(),
		staleTime: Infinity,
	})

export const reportQuery = (id: string) =>
	queryOptions({
		queryKey: ['admin', 'reporter', 'report', id],
		queryFn: async () =>
			ReportSchema.parse(await adminFetch(`reporter/reports/${id}`)),
		refetchInterval: (query) =>
			query.state.data?.status === 'done' ||
			query.state.data?.status === 'failed'
				? false
				: 3000,
	})

export const notesQuery = () =>
	queryOptions({
		queryKey: ['admin', 'reporter', 'notes'],
		queryFn: async () =>
			z.array(NoteSchema).parse(await adminFetch('reporter/notes')),
	})

export async function forgetNote(id: number) {
	await adminFetch(`reporter/notes/${id}`, { method: 'DELETE' })
}
