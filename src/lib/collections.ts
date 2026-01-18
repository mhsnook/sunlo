import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	PhraseFullSchema,
	type PhraseFullType,
	PublicProfileSchema,
	type PublicProfileType,
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
	LanguageSchema,
	type LanguageType,
	DeckMetaSchema,
	type DeckMetaType,
	CardMetaSchema,
	type CardMetaType,
	CardReviewSchema,
	type CardReviewType,
	DailyReviewStateSchema,
	type DailyReviewStateType,
	MyProfileSchema,
	type MyProfileType,
	FriendSummarySchema,
	type FriendSummaryType,
	ChatMessageSchema,
	type ChatMessageType,
	DeckMetaRawSchema,
	LangTagSchema,
	type LangTagType,
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
} from './schemas'
import {
	PhrasePlaylistSchema,
	type PhrasePlaylistType,
	PlaylistPhraseLinkSchema,
	type PlaylistPhraseLinkType,
	PhrasePlaylistUpvoteSchema,
	type PhrasePlaylistUpvoteType,
} from './schemas-playlist'
import { queryClient } from './query-client'
import supabase from './supabase-client'
import { sortDecksByCreation } from './utils'
import { themes } from './deck-themes'
import { queryOptions } from '@tanstack/react-query'
import languages from './languages'

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
		id: 'public_profiles',
		queryKey: ['public', 'profiles'],
		queryFn: async () => {
			console.log(`Loading publicProfilesCollection`)
			const { data } = await supabase
				.from('public_profile')
				.select()
				.throwOnError()
			return data?.map((p) => PublicProfileSchema.parse(p)) ?? []
		},
		getKey: (item: PublicProfileType) => item.uid,
		queryClient,
		schema: PublicProfileSchema,
	})
)

export const phraseRequestsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_requests',
		queryKey: ['public', 'phrase_request'],
		queryFn: async () => {
			console.log(`Loading phraseRequestscollection`)

			const { data } = await supabase
				.from('phrase_request')
				.select()
				.throwOnError()
			return data?.map((p) => PhraseRequestSchema.parse(p)) ?? []
		},
		getKey: (item: PhraseRequestType) => item.id,
		schema: PhraseRequestSchema,
		queryClient,
	})
)

export const phrasesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrases',
		queryKey: ['public', 'phrase_full'],
		getKey: (item: PhraseFullType) => item.id,
		queryFn: async () => {
			console.log(`Loading phrasesCollection`)

			const { data } = await supabase
				.from('phrase_meta')
				.select('*, translations:phrase_translation(*)')
				.throwOnError()
			return data?.map((p) => PhraseFullSchema.parse(p)) ?? []
		},
		schema: PhraseFullSchema,
		queryClient,
	})
)

export const langTagsCollection = createCollection(
	queryCollectionOptions({
		id: 'lang_tags',
		queryKey: ['public', 'lang_tag'],
		getKey: (item: LangTagType) => item.id,
		queryFn: async () => {
			console.log(`Loading langTagsCollection`)
			const { data } = await supabase.from('tag').select().throwOnError()
			return data?.map((p) => LangTagSchema.parse(p)) ?? []
		},
		schema: LangTagSchema,
		queryClient,
	})
)

export const languagesCollection = createCollection(
	queryCollectionOptions({
		id: 'languages',
		queryKey: ['public', 'meta_language'],
		queryFn: async () => {
			console.log(`Loading languagesCollection`)
			const { data } = await supabase
				.from('meta_language')
				.select()
				.is('alias_of', null)
				.throwOnError()
			return data?.map((item) => LanguageSchema.parse(item)) ?? []
		},
		getKey: (item: LanguageType) => item.lang,
		schema: LanguageSchema,
		queryClient,
	})
)

export const myProfileQuery = queryOptions({
	queryKey: ['user', 'profile'],
	queryFn: async (_) => {
		console.log(`Running myProfileQuery`)
		const { data } = await supabase
			.from('user_profile')
			.select()
			.throwOnError()
			.maybeSingle()
		if (!data) return []
		return [MyProfileSchema.parse(data)]
	},
})

export const myProfileCollection = createCollection(
	queryCollectionOptions({
		id: 'my_profile',
		queryKey: myProfileQuery.queryKey,
		queryFn: async (args) => {
			console.log(`Loading myProfileCollection`)
			return myProfileQuery.queryFn!(args)
		},
		getKey: (item: MyProfileType) => item.uid,
		queryClient,
		startSync: false,
		schema: MyProfileSchema,
	})
)

export const decksCollection = createCollection(
	queryCollectionOptions({
		id: 'decks',
		queryKey: ['user', 'deck_plus'],
		queryFn: async () => {
			console.log(`Loading decksCollection`)
			const { data } = await supabase
				.from('user_deck_plus')
				.select()
				.throwOnError()
			return (
				data
					?.map((item) => DeckMetaRawSchema.parse(item))
					.toSorted(sortDecksByCreation)
					.map((d, i) =>
						Object.assign(d, {
							theme: i % themes.length,
							language: languages[d.lang],
						})
					) ?? []
			)
		},
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		startSync: false,
		schema: DeckMetaSchema,
	})
)

export const cardsCollection = createCollection(
	queryCollectionOptions({
		id: 'cards',
		queryKey: ['user', 'card'],
		queryFn: async () => {
			console.log(`Loading cardsCollection`)
			const { data } = await supabase
				.from('user_card_plus')
				.select()
				.throwOnError()
			return data?.map((item) => CardMetaSchema.parse(item)) ?? []
		},
		getKey: (item: CardMetaType) => item.phrase_id,
		queryClient,
		startSync: false,
		schema: CardMetaSchema,
	})
)

export const reviewDaysCollection = createCollection(
	queryCollectionOptions({
		id: 'review_days',
		queryKey: ['user', 'daily_review_state'],
		queryFn: async () => {
			console.log(`Loading reviewDaysCollection`)
			const { data } = await supabase
				.from('user_deck_review_state')
				.select()
				.throwOnError()
			return data?.map((item) => DailyReviewStateSchema.parse(item)) ?? []
		},
		getKey: (item: DailyReviewStateType) => `${item.day_session}--${item.lang}`,
		queryClient,
		startSync: false,
		schema: DailyReviewStateSchema,
	})
)

export const cardReviewsCollection = createCollection(
	queryCollectionOptions({
		id: 'card_reviews',
		queryKey: ['user', 'card_review'],
		queryFn: async () => {
			console.log(`Loading cardReviewsCollection`)
			const { data } = await supabase
				.from('user_card_review')
				.select()
				.throwOnError()
			return data?.map((item) => CardReviewSchema.parse(item)) ?? []
		},
		getKey: (item: CardReviewType) => item.id,
		queryClient,
		startSync: false,
		schema: CardReviewSchema,
	})
)

export const friendSummariesCollection = createCollection(
	queryCollectionOptions({
		id: 'friends',
		queryKey: ['user', 'friend_summary'],
		queryFn: async () => {
			console.log(`Loading friendSummariesCollection`)
			const { data } = await supabase
				.from('friend_summary')
				.select()
				.throwOnError()
			return data?.map((item) => FriendSummarySchema.parse(item)) ?? []
		},
		getKey: (item: FriendSummaryType) => `${item.uid_less}--${item.uid_more}`,
		queryClient,
		startSync: false,
		schema: FriendSummarySchema,
	})
)

export const chatMessagesCollection = createCollection(
	queryCollectionOptions({
		id: 'chat_messages',
		queryKey: ['user', 'chat_message'],
		queryFn: async () => {
			console.log(`Loading chatMessagesCollection`)
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (!user) {
				console.log(`chatMessagesCollection: No user, returning empty`)
				return []
			}
			// Explicitly filter for messages where user is sender OR recipient
			// This works around an RLS issue where the OR condition wasn't returning recipient messages
			const { data } = await supabase
				.from('chat_message')
				.select()
				.or(`sender_uid.eq.${user.id},recipient_uid.eq.${user.id}`)
				.throwOnError()
			// Debug: Log message counts by sender/recipient
			if (data) {
				const asSender = data.filter((m) => m.sender_uid === user.id).length
				const asRecipient = data.filter(
					(m) => m.recipient_uid === user.id
				).length
				console.log(
					`chatMessagesCollection loaded: ${data.length} total, ${asSender} as sender, ${asRecipient} as recipient, userId: ${user.id}`
				)
			}
			return data?.map((item) => ChatMessageSchema.parse(item)) ?? []
		},
		getKey: (item: ChatMessageType) => item.id,
		queryClient,
		startSync: false,
		schema: ChatMessageSchema,
	})
)

// Comment system collections
export const commentsCollection = createCollection(
	queryCollectionOptions({
		id: 'request_comments',
		queryKey: ['public', 'request_comment'],
		queryFn: async () => {
			console.log(`Loading commentsCollection`)
			const { data } = await supabase
				.from('request_comment')
				.select()
				.throwOnError()
			return data?.map((item) => RequestCommentSchema.parse(item)) ?? []
		},
		/*
		onUpdate: async (item) => {},
		onInsert: async (item) => {},
		onDelete: async (commentId) => {},
		*/
		getKey: (item: RequestCommentType) => item.id,
		queryClient,
		schema: RequestCommentSchema,
	})
)

export const commentPhraseLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_phrase_links',
		queryKey: ['public', 'comment_phrase_link'],
		queryFn: async () => {
			console.log(`Loading commentPhraseLinksCollection`)
			const { data } = await supabase
				.from('comment_phrase_link')
				.select()
				.throwOnError()
			return data?.map((item) => CommentPhraseLinkSchema.parse(item)) ?? []
		},
		getKey: (item: CommentPhraseLinkType) => item.id,
		queryClient,
		schema: CommentPhraseLinkSchema,
	})
)

export const commentUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_upvotes',
		queryKey: ['user', 'comment_upvote'],
		queryFn: async () => {
			console.log(`Loading commentUpvotesCollection`)
			const { data } = await supabase
				.from('comment_upvote')
				.select('comment_id')
				.throwOnError()
			return data?.map((item) => CommentUpvoteSchema.parse(item)) ?? []
		},
		// this is a one-column table consisting of comment IDs only
		getKey: (item: CommentUpvoteType) => item.comment_id,
		queryClient,
		schema: CommentUpvoteSchema,
	})
)

export const phraseRequestUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_request_upvotes',
		queryKey: ['user', 'phrase_request_upvote'],
		queryFn: async () => {
			console.log(`Loading phraseRequestUpvotesCollection`)
			const { data } = await supabase
				.from('phrase_request_upvote')
				.select('request_id')
				.throwOnError()
			return data?.map((item) => PhraseRequestUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhraseRequestUpvoteType) => item.request_id,
		queryClient,
		schema: PhraseRequestUpvoteSchema,
	})
)

export const phrasePlaylistUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_playlist_upvotes',
		queryKey: ['user', 'phrase_playlist_upvote'],
		queryFn: async () => {
			console.log(`Loading phrasePlaylistUpvotesCollection`)
			const { data } = await supabase
				.from('phrase_playlist_upvote')
				.select('playlist_id')
				.throwOnError()
			return data?.map((item) => PhrasePlaylistUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhrasePlaylistUpvoteType) => item.playlist_id,
		queryClient,
		schema: PhrasePlaylistUpvoteSchema,
	})
)

export const phrasePlaylistsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_playlist',
		queryKey: ['public', 'playlist'],
		queryFn: async (/*{ meta }*/) => {
			console.log(`Loading phrasePlaylistsCollection`)
			// const params = parseLoadSubsetOptions(meta?.loadSubsetOptions)
			const { data } = await supabase
				.from('phrase_playlist')
				.select()
				// .eq('uid', params.uid)
				.throwOnError()

			return data
		},
		getKey: (item: PhrasePlaylistType) => item.id,
		queryClient,
		schema: PhrasePlaylistSchema,
		// snycMode: 'on-demand',
	})
)

export const playlistPhraseLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'playlist_phrase_links',
		queryKey: ['public', 'playlist_phrase_link'],
		queryFn: async (/*{ meta }*/) => {
			console.log(`Loading playlistPhraseLinksCollection`)
			// const params = parseLoadSubsetOptions(meta?.loadSubsetOptions)
			const { data } = await supabase
				.from('playlist_phrase_link')
				.select()
				// .eq('uid', params.uid)
				.throwOnError()

			return data
		},
		getKey: (item: PlaylistPhraseLinkType) => item.id,
		queryClient,
		schema: PlaylistPhraseLinkSchema,
		// snycMode: 'on-demand',
	})
)

export const clearUser = async () => {
	// Clean up all user collections
	await Promise.all([
		myProfileCollection.cleanup(),
		decksCollection.cleanup(),
		cardsCollection.cleanup(),
		reviewDaysCollection.cleanup(),
		cardReviewsCollection.cleanup(),
		friendSummariesCollection.cleanup(),
		chatMessagesCollection.cleanup(),
		commentsCollection.cleanup(),
		commentPhraseLinksCollection.cleanup(),
		commentUpvotesCollection.cleanup(),
		phraseRequestUpvotesCollection.cleanup(),
		phrasePlaylistUpvotesCollection.cleanup(),
	])

	// Also clear React Query cache for user queries to prevent stale data
	// from showing after sign out (e.g., avatar on home page)
	queryClient.removeQueries({ queryKey: ['user'] })
}
