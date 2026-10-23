import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getSession } from './session'

export const rangeOptions = [7, 14, 30] as const
export type RangeDays = (typeof rangeOptions)[number]

export const DailyActivitySchema = z.object({
	day: z.string(),
	active_users: z.number(),
	new_users: z.number(),
	reviewers: z.number(),
	reviews: z.number(),
	cards_added: z.number(),
	decks_created: z.number(),
	phrases_added: z.number(),
	translations_added: z.number(),
	requests_added: z.number(),
	comments_added: z.number(),
	playlists_added: z.number(),
	chat_messages: z.number(),
})

export type DailyActivityType = z.infer<typeof DailyActivitySchema>
export type DailyMetric = Exclude<keyof DailyActivityType, 'day'>

export const ActivityOverviewSchema = z.object({
	since: z.string(),
	days: z.array(DailyActivitySchema),
	totals: z.object({
		total_users: z.number(),
		onboarded_users: z.number(),
		active_users: z.number(),
		active_users_prev: z.number(),
		new_users: z.number(),
		new_users_prev: z.number(),
		reviews: z.number(),
		reviews_prev: z.number(),
	}),
})

export type ActivityOverviewType = z.infer<typeof ActivityOverviewSchema>

export const MostActiveUserSchema = z.object({
	uid: z.string(),
	username: z.string().nullable(),
	email: z.string().nullable(),
	actions: z.number(),
	reviews: z.number(),
	contributions: z.number(),
	active_days: z.number(),
	last_active_at: z.string(),
	deck_langs: z.array(z.string()).nullable(),
})

export type MostActiveUserType = z.infer<typeof MostActiveUserSchema>

export const NewestUserSchema = z.object({
	uid: z.string(),
	username: z.string().nullable(),
	email: z.string().nullable(),
	created_at: z.string(),
	last_sign_in_at: z.string().nullable(),
	onboarded: z.boolean(),
	deck_langs: z.array(z.string()).nullable(),
	reviews: z.number(),
})

export type NewestUserType = z.infer<typeof NewestUserSchema>

export const UserActivitySchema = z.object({
	most_active: z.array(MostActiveUserSchema),
	newest: z.array(NewestUserSchema),
})

// The admin Worker (apps/admin/worker) answers /api on this origin. It checks
// the token and the admin_user table itself.
async function fetchStats(path: string, params: Record<string, number>) {
	const session = await getSession()
	const query = new URLSearchParams(
		Object.entries(params).map(([key, value]) => [key, String(value)])
	)
	const res = await fetch(`/api/${path}?${query}`, {
		headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
	})
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string
		} | null
		throw new Error(body?.error ?? `The stats request failed (${res.status})`)
	}
	return res.json() as Promise<unknown>
}

export const activityOverviewQuery = (days: RangeDays) =>
	queryOptions({
		queryKey: ['admin', 'activity-overview', days],
		queryFn: async () =>
			ActivityOverviewSchema.parse(
				await fetchStats('activity-overview', { days })
			),
	})

export const userActivityQuery = (days: RangeDays) =>
	queryOptions({
		queryKey: ['admin', 'user-activity', days],
		queryFn: async () =>
			UserActivitySchema.parse(
				await fetchStats('user-activity', { days, limit: 20 })
			),
	})
