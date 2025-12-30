import { createFileRoute } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { Loader } from '@/components/ui/loader'
import { useOnePlaylist, useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { CardResultSimple } from '@/components/cards/card-result-simple'

export const Route = createFileRoute(
	'/_user/learn/$lang/playlists/$playlistId'
)({
	component: RouteComponent,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function RouteComponent() {
	const { playlistId } = Route.useParams()
	const { data: playlist, isLoading } = useOnePlaylist(playlistId)
	const { data: rows } = useOnePlaylistPhrases(playlistId)
	return (
		<main style={style}>
			{isLoading ?
				<Loader />
			: !playlist ?
				<Show404 />
			:	<>
					<PlaylistItem playlist={playlist} />
					{rows?.map(({ link, phrase }) => (
						<div key={link.id}>
							{link.href ?
								<a className="s-link" href={link.href}>
									Link to this clip
								</a>
							:	null}
							<CardResultSimple phrase={phrase} />
						</div>
					))}
				</>
			}
		</main>
	)
}

function Show404() {
	return <p>Playlist not found</p>
}
