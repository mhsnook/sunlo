import type { CSSProperties, ReactNode } from 'react'
import { ExternalLink, LinkIcon } from 'lucide-react'
import { PhrasePlaylistType } from '@/lib/schemas-playlist'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Badge, LangBadge } from '@/components/ui/badge'
import { useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { SharePlaylistButton } from './share-playlist-button'
import { UpvotePlaylist } from './upvote-playlist-button'
import { Separator } from '@/components/ui/separator'
import { Link } from '@tanstack/react-router'
import { PlaylistEmbed } from './playlist-embed'
import { useProfile } from '@/hooks/use-profile'
import { UpdatePlaylistDialog } from './update-playlist-dialog'
import { DeletePlaylistDialog } from './delete-playlist-dialog'

export function PlaylistItem({
	playlist,
	children,
}: {
	playlist: PhrasePlaylistType
	children?: ReactNode
}) {
	const { data } = useOnePlaylistPhrases(playlist.id)
	const { data: profile } = useProfile()
	const isOwner = profile?.uid === playlist.uid

	return (
		<div
			style={
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				{ viewTransitionName: `playlist-${playlist.id}` } as CSSProperties
			}
			className="bg-card text-card-foreground @container flex flex-col gap-3 rounded-lg border p-6 shadow-sm"
		>
			<div className="flex flex-row items-center justify-between gap-2">
				<UidPermalink
					uid={playlist.uid}
					action="created a Playlist"
					timeLinkTo="/learn/$lang/playlists/$playlistId"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkParams={{
						lang: playlist.lang,
						playlistId: playlist.id,
					}}
					timeValue={playlist.created_at}
				/>

				<div className="flex items-center gap-2">
					{isOwner && (
						<>
							<UpdatePlaylistDialog playlist={playlist} />
							<DeletePlaylistDialog playlist={playlist} />
						</>
					)}
					<Badge variant="outline">
						{data?.length ?? 0} phrase
						{data?.length === 1 ? '' : 's'}
					</Badge>
					<LangBadge lang={playlist.lang} />
				</div>
			</div>
			<div className="flex items-start justify-between gap-4">
				<h2 className="h2 my-0">{playlist.title}</h2>
			</div>
			{playlist.description && (
				<p className="text-muted-foreground text-sm">{playlist.description}</p>
			)}

			{/* Embed player for source material */}
			{playlist.href && <PlaylistEmbed href={playlist.href} />}

			{/* Track list of linked phrases */}
			{data && data.length > 0 && (
				<div className="text-muted-foreground flex flex-col gap-1 text-sm">
					{data.map(({ phrase }, index) => (
						<Link
							key={phrase.id}
							to="/learn/$lang/phrases/$id"
							// oxlint-disable-next-line jsx-no-new-object-as-prop
							params={{ lang: phrase.lang, id: phrase.id }}
							className="hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1 transition-colors"
						>
							<span className="text-muted-foreground/50 w-6 text-right text-xs">
								{index + 1}
							</span>
							<span
								className="truncate font-medium"
								style={
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									{
										viewTransitionName: `phrase-text-${phrase.id}`,
									} as CSSProperties
								}
							>
								&ldquo;
								{phrase.text.length > 60 ?
									`${phrase.text.slice(0, 60)}...`
								:	phrase.text}
								&rdquo;
							</span>
							{phrase.translations && phrase.translations.length > 0 && (
								<span className="text-muted-foreground/70 ml-auto text-xs whitespace-nowrap">
									{phrase.translations.length} translation
									{phrase.translations.length === 1 ? '' : 's'}
								</span>
							)}
						</Link>
					))}
				</div>
			)}

			<div className="text-muted-foreground flex items-center gap-4 text-sm">
				<UpvotePlaylist playlist={playlist} />
				<SharePlaylistButton id={playlist.id} />
				{!children ?
					<Link
						to="/learn/$lang/playlists/$playlistId"
						className="hover:text-foreground flex items-center gap-1"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: playlist.lang, playlistId: playlist.id }}
					>
						<LinkIcon className="h-4 w-4" /> Playlist details
					</Link>
				: playlist.href ?
					<a
						className="hover:text-foreground flex items-center gap-1"
						href={playlist.href}
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink className="h-4 w-4" />
						<span>Source link</span>
					</a>
				:	null}
			</div>
			{children && <Separator />}
			{children}
		</div>
	)
}
