import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { count, eq } from '@tanstack/db'
import toast from 'react-hot-toast'
import { ThumbsUp } from 'lucide-react'

import {
	phrasePlaylistsCollection,
	phrasePlaylistUpvotesCollection,
} from '@/lib/collections'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { PhrasePlaylistType } from '@/lib/schemas-playlist'

export function UpvotePlaylist({ playlist }: { playlist: PhrasePlaylistType }) {
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phrasePlaylistUpvotesCollection })
				.where(({ upvote }) => eq(upvote.playlist_id, playlist.id))
				.select(({ upvote }) => ({ total: count(upvote.playlist_id) })),
		[playlist.id]
	).data?.length

	// Toggle upvote mutation
	const toggleUpvoteMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase.rpc(
				'toggle_phrase_playlist_upvote',
				{
					p_playlist_id: playlist.id,
				}
			)
			if (error) throw error
			return data as {
				playlist_id: uuid
				action: 'added' | 'removed'
			}
		},
		onSuccess: (data) => {
			const currentCount = playlist.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			phrasePlaylistsCollection.utils.writeUpdate({
				id: data.playlist_id,
				upvote_count: newCount,
			})
			if (data.action === 'added') {
				phrasePlaylistUpvotesCollection.utils.writeInsert({
					playlist_id: data.playlist_id,
				})
			} else {
				phrasePlaylistUpvotesCollection.utils.writeDelete(data.playlist_id)
			}
		},
		onError: (error: Error) => {
			toast.error(`Failed to toggle upvote: ${error.message}`)
		},
	})

	return (
		<div className="text-muted-foreground flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'outline-primary' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this playlist'}
				size="icon"
				data-testid="upvote-playlist-button"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={(e) => {
					e.stopPropagation()
					toggleUpvoteMutation.mutate()
				}}
				disabled={toggleUpvoteMutation.isPending}
			>
				<ThumbsUp />
			</Button>
			<span className="font-medium">
				{playlist.upvote_count}{' '}
				<span className="sr-only">
					vote{playlist.upvote_count === 1 ? '' : 's'}
				</span>
			</span>
		</div>
	)
}
