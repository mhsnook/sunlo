import { createFileRoute } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { Loader } from '@/components/ui/loader'
import { useOnePlaylist, useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import languages from '@/lib/languages'
import { Button } from '@/components/ui/button'
import { ExternalLink, HeartPlus } from 'lucide-react'
import Flagged from '@/components/flagged'
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
	const { data: rows } = useOnePlaylistPhrases(playlistId)

	return (
		<main style={style}>
			{isLoading ?
				<Loader />
			: !playlist ?
				<Show404 />
			:	<div className="space-y-4">
					<PlaylistItem playlist={playlist}>
						<div className="flex w-full flex-row items-center justify-between gap-2">
							<h3 className="h3">
								{rows?.length ?? 0} flashcards in this playlist
							</h3>
							<Flagged>
								<Button variant="outline-primary">
									<HeartPlus />
									Add all {rows?.length} flashcards
								</Button>
							</Flagged>
						</div>
						{rows?.length &&
							rows.map((row, i) => (
								<div key={row.link.id} className="space-y-2">
									<div className="flex flex-row items-start justify-start gap-2 text-sm">
										<span>{i + 1}.</span>
										{row.link.href ?
											<a
												className="s-link-muted inline-flex shrink-0 items-center gap-1"
												href={row.link.href}
											>
												<span>[ goto clip</span> <ExternalLink size={14} />
												<span>]</span>
											</a>
										:	null}
										<p className="line-clamp-1">
											&ldquo;{row.phrase.text.trim()}&rdquo;
										</p>
									</div>
									<CardResultSimple phrase={row.phrase} />
								</div>
							))}
					</PlaylistItem>
				</div>
			}
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
