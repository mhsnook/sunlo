import * as z from 'zod'

export const UserContributionsTabs = z.object({
	contributionsTab: z
		.enum(['requests', 'phrases', 'playlists', 'answers', 'comments'])
		.optional(),
})
