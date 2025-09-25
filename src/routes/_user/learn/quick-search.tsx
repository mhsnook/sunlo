import { createFileRoute } from '@tanstack/react-router'
import { TitleBar } from '@/types/main'

// @@BLANKROUTE maybe remove this route??
export const Route = createFileRoute('/_user/learn/quick-search')({
	loader: () => ({
		titleBar: {
			title: `Quick Search for a Phrase`,
		} as TitleBar,
	}),
	component: () => <div>Hello /_app/learn/quick-search!</div>,
})
