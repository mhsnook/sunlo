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

export function PlaylistItem({
	playlist,
	children,
}: {
	playlist: PhrasePlaylistType
	children?: ReactNode
}) {
	const { data } = useOnePlaylistPhrases(playlist.id)

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
					<Badge variant="outline">
						{data?.length ?? playlist.phrase_count ?? 0} phrase
						{(data?.length ?? playlist.phrase_count) === 1 ? '' : 's'}
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
