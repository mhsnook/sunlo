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
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import { should, serverCheck, failed } from '@scenetest/checks-react'

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
				transaction.mutations.map((m) =>
					supabase
						.from('phrase_request')
						.update(m.changes)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			// m.changes IS the optimistic collection value; confirming the
			// server row matches it proves client/server agreement. The
			// service-role client bypasses RLS, so soft-deleted rows
			// (deleted: true) are still readable. Stripped from production.
			serverCheck(
				'phrase_request rows match the submitted updates',
				async (server, { updates }) => {
					await Promise.all(
						updates.map(async (u) => {
							const { data, error } = await server.supabase
								.from('phrase_request')
								.select()
								.eq('id', u.id)
								.maybeSingle()
							if (error || !data) {
								failed('fetch phrase_request after update', {
									error: error?.message,
									id: u.id,
								})
								return
							}
							const row = data as Record<string, unknown>
							should(
								`phrase_request ${u.id} persisted the submitted values`,
								Object.entries(u.changes).every(
									([k, v]) =>
										k === 'updated_at' || k === 'created_at' || row[k] === v
								),
								{ submitted: u.changes, returned: data }
							)
						})
					)
				},
				() => ({
					updates: transaction.mutations.map((m) => ({
						id: m.original.id,
						changes: m.changes as Record<string, unknown>,
					})),
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
				transaction.mutations.map((m) =>
					supabase
						.from('request_comment')
						.update(m.changes)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			// Confirm the server row matches the optimistic edit. Stripped
			// from production.
			serverCheck(
				'request_comment rows match the submitted updates',
				async (server, { updates }) => {
					await Promise.all(
						updates.map(async (u) => {
							const { data, error } = await server.supabase
								.from('request_comment')
								.select()
								.eq('id', u.id)
								.maybeSingle()
							if (error || !data) {
								failed('fetch request_comment after update', {
									error: error?.message,
									id: u.id,
								})
								return
							}
							const row = data as Record<string, unknown>
							should(
								`request_comment ${u.id} persisted the submitted values`,
								Object.entries(u.changes).every(
									([k, v]) =>
										k === 'updated_at' || k === 'created_at' || row[k] === v
								),
								{ submitted: u.changes, returned: data }
							)
						})
					)
				},
				() => ({
					updates: transaction.mutations.map((m) => ({
						id: m.original.id,
						changes: m.changes as Record<string, unknown>,
					})),
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('request_comment')
						.delete()
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			// Confirm the rows are gone server-side. Stripped from production.
			serverCheck(
				'deleted request_comment rows are gone from the server',
				async (server, { ids }) => {
					const { data, error } = await server.supabase
						.from('request_comment')
						.select('id')
						.in('id', ids)
					if (error) {
						failed('fetch request_comment after delete', {
							error: error.message,
						})
						return
					}
					should('no deleted comment rows remain', (data?.length ?? 0) === 0, {
						deletedIds: ids,
						stillPresent: data,
					})
				},
				() => ({ ids: transaction.mutations.map((m) => m.original.id) })
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
