import { createFileRoute } from '@tanstack/react-router'

// @@BLANKROUTE maybe remove this route??
export const Route = createFileRoute('/_user/learn/quick-search')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Quick Search for a Phrase',
		},
	}),
	component: () => <div>Hello /_app/learn/quick-search!</div>,
})
