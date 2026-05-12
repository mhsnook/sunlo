import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const SearchSchema = z.object({
	lang: z.string().optional(),
})

export const Route = createFileRoute('/_user/learn/add-deck')({
	validateSearch: SearchSchema,
	beforeLoad: () => ({
		titleBar: {
			title: 'Start A New Deck of Flashcards',
		},
	}),
})
