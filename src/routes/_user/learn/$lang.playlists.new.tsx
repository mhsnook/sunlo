import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'

export const Route = createFileRoute('/_user/learn/$lang/playlists/new')({
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Add ${languages[lang]} Playlist`,
		},
	}),
})
