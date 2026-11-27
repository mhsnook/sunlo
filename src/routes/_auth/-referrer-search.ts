import * as z from 'zod'

const ReferrerSearchSchema = z.object({
	referrer: z.string().uuid().optional(),
})

export type ReferrerSearch = z.infer<typeof ReferrerSearchSchema>

/** `?referrer=<uid>` from a friend's invite link, dropped if it is not a uuid. */
export function validateReferrerSearch(
	search: Record<string, unknown>
): ReferrerSearch {
	const result = ReferrerSearchSchema.safeParse(search)
	return result.success ? result.data : {}
}
