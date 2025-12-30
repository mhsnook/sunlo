import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Heart, Share2 } from 'lucide-react'
import { PhrasePlaylistType } from '@/lib/schemas'
import { UidPermalink } from '@/components/card-pieces/user-permalink'

export function PlaylistItem({ playlist }: { playlist: PhrasePlaylistType }) {
	return (
		<div
			style={
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				{ viewTransitionName: `playlist-${playlist.id}` } as CSSProperties
			}
			className="bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-sm"
		>
			<UidPermalink
				uid={playlist.uid}
				timeLinkTo="/learn/$lang/playlists/$playlistId"
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				timeLinkParams={{
					lang: playlist.lang,
					playlistId: playlist.id,
				}}
				timeValue={playlist.created_at}
			/>
			<div className="flex items-start justify-between gap-4">
				<div className="grid gap-1">
					<Link
						to="/learn/$lang/playlists/$playlistId"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: playlist.lang, playlistId: playlist.id }}
						className="leading-none font-semibold tracking-tight hover:underline"
					>
						{playlist.title}
					</Link>
					<p className="text-muted-foreground text-sm">{playlist.lang}</p>
				</div>
			</div>
			{playlist.description && (
				<p className="text-muted-foreground text-sm">{playlist.description}</p>
			)}
			<div className="text-muted-foreground flex items-center gap-4 text-sm">
				<div className="flex items-center gap-1">
					<Heart className="h-4 w-4" />
					<span>{playlist.likes_count || 0}</span>
				</div>
				<button className="hover:text-foreground flex items-center gap-1">
					<Share2 className="h-4 w-4" />
					<span>Share</span>
				</button>
			</div>
		</div>
	)
}
