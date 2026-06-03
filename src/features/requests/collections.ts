import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
	MessageSchema,
	type MessageType,
	MessageTagSchema,
	type MessageTagType,
	MessageTagLinkSchema,
	type MessageTagLinkType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import { should } from '@scenetest/checks-react'

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
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('phrase_request')
						.update(m.changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					// m.changes IS the optimistic collection value; confirming the
					// server's returned row matches it proves client/server
					// agreement. A soft-delete (deleted: true) may not be
					// selectable back under RLS — `!row ||` skips the assertion
					// rather than failing. The guard lives inside should() so the
					// whole call strips cleanly from production builds.
					const row = data?.[0] as Record<string, unknown> | undefined
					should(
						`phrase_request ${m.original.id} server row matches the submitted update`,
						!row ||
							Object.entries(m.changes).every(
								([k, v]) =>
									k === 'updated_at' || k === 'created_at' || row[k] === v
							),
						{ submitted: m.changes, returned: row }
					)
				})
			)
			return { refetch: false }
		},
	})
)

export const phraseRequestUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_request_upvotes',
		queryKey: ['user', 'phrase_request_upvote'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
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
		getKey: (item: RequestCommentType) => item.id,
		queryClient,
		schema: RequestCommentSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('request_comment')
						.update(m.changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					// Confirm the server's returned row matches the optimistic
					// edit. The row-guard lives inside should() so the whole call
					// strips cleanly from production builds.
					const row = data?.[0] as Record<string, unknown> | undefined
					should(
						`request_comment ${m.original.id} server row matches the submitted update`,
						!row ||
							Object.entries(m.changes).every(
								([k, v]) =>
									k === 'updated_at' || k === 'created_at' || row[k] === v
							),
						{ submitted: m.changes, returned: row }
					)
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('request_comment')
						.delete()
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					// A delete with .select() returns the rows it removed; confirm
					// we removed exactly the targeted comment. Stripped from
					// production by the Vite plugin.
					should(
						`request_comment delete removed comment ${m.original.id}`,
						data?.length === 1 && data[0].id === m.original.id,
						{ targetId: m.original.id, returned: data }
					)
				})
			)
			// Cascade-deleted replies and phrase links linger in the local
			// collections until the next stale refetch, but they don't render
			// (orphaned replies have no parent anchor; orphaned phrase links
			// filter out of the provenance inner-join). Skipping the full-table
			// refetch is worth that small inconsistency.
			return { refetch: false }
		},
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
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const commentUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_upvotes',
		queryKey: ['user', 'comment_upvote'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
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

// `message` is the cross-language object behind each phrase_request. Today
// it's 1:1 with a request (auto-created by a DB trigger on insert), but
// holds the tag links and will later group reposts of the same underlying
// message across languages. See migration 20260526120000.
export const messagesCollection = createCollection(
	queryCollectionOptions({
		id: 'messages',
		queryKey: ['public', 'message'],
		queryFn: async () => {
			console.log(`Loading messagesCollection`)
			const { data } = await supabase.from('message').select().throwOnError()
			return data?.map((item) => MessageSchema.parse(item)) ?? []
		},
		getKey: (item: MessageType) => item.id,
		queryClient,
		schema: MessageSchema,
	})
)

export const messageTagsCollection = createCollection(
	queryCollectionOptions({
		id: 'message_tags',
		queryKey: ['public', 'message_tag'],
		queryFn: async () => {
			console.log(`Loading messageTagsCollection`)
			const { data } = await supabase
				.from('message_tag')
				.select()
				.order('sort_order', { ascending: true })
				.throwOnError()
			return data?.map((item) => MessageTagSchema.parse(item)) ?? []
		},
		getKey: (item: MessageTagType) => item.slug,
		queryClient,
		schema: MessageTagSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					await supabase
						.from('message_tag')
						.insert({
							slug: m.modified.slug,
							label: m.modified.label,
							description: m.modified.description,
							sort_order: m.modified.sort_order,
						})
						.throwOnError()
				})
			)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					// .select() so we can confirm rows were actually affected:
					// RLS-protected UPDATE silently returns 0 rows when the
					// caller lacks permission (no PostgREST error). Throwing
					// rolls the optimistic state back and surfaces the failure.
					const { data } = await supabase
						.from('message_tag')
						.update(m.changes)
						.eq('slug', m.original.slug)
						.select()
						.throwOnError()
					if (!data || data.length === 0) {
						throw new Error(
							`Update on message_tag "${m.original.slug}" affected no rows (permission denied or row removed).`
						)
					}
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('message_tag')
						.delete()
						.eq('slug', m.original.slug)
						.select()
						.throwOnError()
					if (!data || data.length === 0) {
						throw new Error(
							`Delete on message_tag "${m.original.slug}" affected no rows (permission denied or row removed).`
						)
					}
				})
			)
			return { refetch: false }
		},
	})
)

export const messageTagLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'message_tag_links',
		queryKey: ['public', 'message_tag_link'],
		queryFn: async () => {
			console.log(`Loading messageTagLinksCollection`)
			const { data } = await supabase
				.from('message_tag_link')
				.select()
				.throwOnError()
			return data?.map((item) => MessageTagLinkSchema.parse(item)) ?? []
		},
		// composite PK; getKey just needs to be stable+unique per row
		getKey: (item: MessageTagLinkType) =>
			`${item.message_id}--${item.tag_slug}`,
		queryClient,
		schema: MessageTagLinkSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					await supabase
						.from('message_tag_link')
						.insert({
							message_id: m.modified.message_id,
							tag_slug: m.modified.tag_slug,
						})
						.throwOnError()
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('message_tag_link')
						.delete()
						.eq('message_id', m.original.message_id)
						.eq('tag_slug', m.original.tag_slug)
						.select()
						.throwOnError()
					if (!data || data.length === 0) {
						throw new Error(
							`Delete on message_tag_link (${m.original.message_id}, ${m.original.tag_slug}) affected no rows (permission denied or row already removed).`
						)
					}
				})
			)
			return { refetch: false }
		},
	})
)
