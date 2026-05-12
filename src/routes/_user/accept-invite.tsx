import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const SearchSchema = z.object({
	uid_by: z.string().uuid(),
	uid_for: z.string().uuid(),
	lang: z.string().length(3),
})

export const Route = createFileRoute('/_user/accept-invite')({
	validateSearch: SearchSchema,
	beforeLoad: () => ({
		titleBar: {
			title: 'Accept Invite',
		},
	}),
})
