import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/anki-to-csv')({
	beforeLoad: () => ({
		titleBar: { title: 'Anki Deck → CSV' },
	}),
})
