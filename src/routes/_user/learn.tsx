import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const LearnSearchParams = z.object({
	search: z.boolean().optional(),
})

export const Route = createFileRoute('/_user/learn')({
	validateSearch: LearnSearchParams,
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Learning Home',
			subtitle: context.auth.isAuth
				? 'Which deck are we studying today?'
				: 'Explore community-created language learning content',
		},
		searchAction: true,
		contextMenu: context.auth.isAuth
			? ['/learn/add-deck', '/learn/contributions']
			: [],
	}),
})
