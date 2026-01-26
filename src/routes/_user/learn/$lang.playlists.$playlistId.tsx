import { createFileRoute } from '@tanstack/react-router'
import { Fragment, useState, type CSSProperties } from 'react'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { Loader } from '@/components/ui/loader'
import { useOnePlaylist, useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import languages from '@/lib/languages'
import { Button } from '@/components/ui/button'
import { ExternalLink, HeartPlus, Plus } from 'lucide-react'
import Flagged from '@/components/flagged'
import Callout from '@/components/ui/callout'
import { useProfile } from '@/hooks/use-profile'
import { InlinePlaylistCardCreator } from '@/components/playlists/inline-playlist-card-creator'

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
	const { data: profile } = useProfile()
	const isOwner = profile?.uid === playlist?.uid
	const [formPosition, setFormPosition] = useState<number | null>(null)

	const getInsertOrder = (position: number) => {
		if (!rows?.length) return 1
		if (position <= 0) return (rows[0].link.order ?? 1) - 1
		if (position >= rows.length)
			return (rows[rows.length - 1].link.order ?? rows.length) + 1
		const prev = rows[position - 1].link.order ?? position - 1
		const next = rows[position].link.order ?? position
		return (prev + next) / 2
	}

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
						{isOwner && (
							<InsertCardSlot
								position={0}
								formPosition={formPosition}
								setFormPosition={setFormPosition}
								lang={playlist.lang}
								playlistId={playlistId}
								order={getInsertOrder(0)}
								sourceHref={playlist.href}
							/>
						)}
						{rows?.length &&
							rows.map((row, i) => (
								<Fragment key={row.link.id}>
									<div className="space-y-2">
										<div className="flex flex-row items-start justify-start gap-2 text-sm">
											<span>{i + 1}.</span>
											{row.link.href ?
												<a
													className="s-link-muted inline-flex shrink-0 items-center gap-1"
													href={row.link.href}
												>
													<span>[ goto clip</span>{' '}
													<ExternalLink size={14} />
													<span>]</span>
												</a>
											:	null}
											<p className="line-clamp-1">
												&ldquo;{row.phrase.text.trim()}&rdquo;
											</p>
										</div>
										<CardResultSimple phrase={row.phrase} />
									</div>
									{isOwner && (
										<InsertCardSlot
											position={i + 1}
											formPosition={formPosition}
											setFormPosition={setFormPosition}
											lang={playlist.lang}
											playlistId={playlistId}
											order={getInsertOrder(i + 1)}
											sourceHref={playlist.href}
										/>
									)}
								</Fragment>
							))}
					</PlaylistItem>
				</div>
			}
		</main>
	)
}

function InsertCardSlot({
	position,
	formPosition,
	setFormPosition,
	lang,
	playlistId,
	order,
	sourceHref,
}: {
	position: number
	formPosition: number | null
	setFormPosition: (pos: number | null) => void
	lang: string
	playlistId: string
	order: number
	sourceHref: string | null
}) {
	if (formPosition === position) {
		return (
			<InlinePlaylistCardCreator
				lang={lang}
				playlistId={playlistId}
				order={order}
				sourceHref={sourceHref}
				onDone={() => setFormPosition(null)}
			/>
		)
	}

	return (
		<button
			type="button"
			onClick={() => setFormPosition(position)}
			className="text-muted-foreground/50 hover:text-primary my-1 flex w-full items-center gap-2 text-xs transition-colors"
		>
			<span className="border-border flex-1 border-t border-dashed" />
			<span className="flex items-center gap-1 whitespace-nowrap">
				<Plus className="h-3 w-3" />
				New card here
			</span>
			<span className="border-border flex-1 border-t border-dashed" />
		</button>
	)
}

function Show404() {
	return (
		<Callout variant="ghost">
			<p className="text-lg">Playlist not found</p>
		</Callout>
	)
}
