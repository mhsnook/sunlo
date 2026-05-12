import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'

export const Route = createFileRoute(
	'/_user/learn/$lang/playlists/$playlistId'
)({
	beforeLoad: ({ params }) => ({
		titleBar: {
			title: `Playlist of ${languages[params.lang]} Flashcards`,
			subtitle: '',
		},
		appnav: [],
	}),
})
