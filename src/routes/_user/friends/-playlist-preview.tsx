import { Link } from '@tanstack/react-router'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'
import { useOnePlaylist, useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { Badge, LangBadge } from '@/components/ui/badge'
import { ListMusic } from 'lucide-react'

export function PlaylistPreview({ id }: { id: uuid }) {
	const { data: playlist, isLoading } = useOnePlaylist(id)
	const { data: phrases, isLoading: isLoadingPhrases } =
		useOnePlaylistPhrases(id)

	if (isLoading) return <Loader className="my-6" />
	if (!playlist)
		return (
			<Callout variant="problem">Can't seem to find that playlist...</Callout>
		)

	return (
		<Link
			to={'/learn/$lang/playlists/$playlistId'}
			params={{ lang: playlist.lang, playlistId: id }}
		>
			<div className="bg-card text-card-foreground @container relative z-10 flex flex-col gap-3 rounded-lg border py-0 shadow-sm">
				<CardHeader className="border-b-primary-foresoft/30 mx-4 mb-0 border-b px-0 py-4">
					<CardTitle className="flex flex-row items-center justify-between gap-1 text-lg">
						<span className="flex items-center gap-1">
							<ListMusic className="text-muted-foreground" /> Playlist
						</span>
						<div className="flex items-center gap-2">
							{!isLoadingPhrases && (
								<Badge variant="outline">
									{phrases?.length ?? 0} phrase
									{phrases?.length === 1 ? '' : 's'}
								</Badge>
							)}
							<LangBadge lang={playlist.lang} />
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 p-4 pt-0">
					<p className="font-medium">{playlist.title}</p>
					{playlist.description && (
						<p className="text-muted-foreground line-clamp-2 text-sm">
							{playlist.description}
						</p>
					)}
				</CardContent>
			</div>
		</Link>
	)
}
