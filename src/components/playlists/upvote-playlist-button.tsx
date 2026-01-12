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
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvotePlaylist({ playlist }: { playlist: PhrasePlaylistType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phrasePlaylistUpvotesCollection })
				.where(({ upvote }) => eq(upvote.playlist_id, playlist.id))
				.select(({ upvote }) => ({ total: count(upvote.playlist_id) })),
		[playlist.id]
	).data?.length

	// Upvote mutation with explicit action
	const upvoteMutation = useMutation({
		mutationFn: async (action: 'add' | 'remove') => {
			const { data, error } = await supabase.rpc('set_phrase_playlist_upvote', {
				p_playlist_id: playlist.id,
				p_action: action,
			})
			if (error) throw error
			return data as {
				playlist_id: uuid
				action: 'added' | 'removed' | 'no_change'
			}
		},
		onSuccess: (data) => {
			// Only update if server actually made a change
			if (data.action === 'no_change') return

			const currentCount = playlist.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			// Update the playlist count
			phrasePlaylistsCollection.utils.writeUpdate({
				id: data.playlist_id,
				upvote_count: newCount,
			})

			// Update the upvotes collection
			if (data.action === 'added') {
				phrasePlaylistUpvotesCollection.utils.writeInsert({
					playlist_id: data.playlist_id,
				})
			} else if (data.action === 'removed') {
				phrasePlaylistUpvotesCollection.utils.writeDelete(data.playlist_id)
			}
		},
		onError: (error: Error) => {
			toast.error(`Failed to update upvote: ${error.message}`)
		},
	})

	return (
		<div className="text-muted-foreground flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'outline-primary' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this playlist'}
				size="icon"
				data-testid="upvote-playlist-button"
				onClick={(e) => {
					e.stopPropagation()
					requireAuth(() => {
						// Send explicit action based on current state
						upvoteMutation.mutate(hasUpvoted ? 'remove' : 'add')
					}, 'Please log in to vote on playlists')
				}}
				disabled={upvoteMutation.isPending}
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
