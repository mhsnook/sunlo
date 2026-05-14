import { queryOptions } from '@tanstack/react-query'
import {
	PhrasePlaylistSchema,
	PlaylistPhraseLinkSchema,
	PhrasePlaylistUpvoteSchema,
} from './schemas'
import supabase from '@/lib/supabase-client'

export const phrasePlaylistsQuery = queryOptions({
	queryKey: ['public', 'playlist'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('phrase_playlist')
			.select()
			.throwOnError()
		return data?.map((item) => PhrasePlaylistSchema.parse(item)) ?? []
	},
})

export const playlistPhraseLinksQuery = queryOptions({
	queryKey: ['public', 'playlist_phrase_link'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('playlist_phrase_link')
			.select()
			.throwOnError()
		return data?.map((item) => PlaylistPhraseLinkSchema.parse(item)) ?? []
	},
})

export const phrasePlaylistUpvotesQuery = queryOptions({
	queryKey: ['user', 'phrase_playlist_upvote'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('phrase_playlist_upvote')
			.select('playlist_id')
			.throwOnError()
		return data?.map((item) => PhrasePlaylistUpvoteSchema.parse(item)) ?? []
	},
})
