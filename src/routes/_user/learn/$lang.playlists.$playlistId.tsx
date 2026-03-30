import { createFileRoute } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { Loader } from '@/components/ui/loader'
import { useOnePlaylist } from '@/features/playlists/hooks'
import languages from '@/lib/languages'
import Callout from '@/components/ui/callout'

export const Route = createFileRoute(
	'/_user/learn/$lang/playlists/$playlistId'
)({
	component: PlaylistPage,
	beforeLoad: ({ params }) => ({
		titleBar: {
			title: `Playlist of ${languages[params.lang]} Flashcards`,
			subtitle: '',
		},
		appnav: [],
	}),
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function PlaylistPage() {
	const { playlistId } = Route.useParams()
	const { data: playlist, isLoading } = useOnePlaylist(playlistId)

	return (
		<main style={style} data-testid="playlist-detail-page">
			{isLoading ?
				<Loader />
			: !playlist ?
				<Show404 />
			:	<PlaylistItem playlist={playlist} />}
		</main>
	)
}

function Show404() {
	return (
		<Callout variant="ghost">
			<p className="text-lg">Playlist not found</p>
		</Callout>
	)
}
