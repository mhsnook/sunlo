import * as z from 'zod'

// Prototype-only schemas. Once the search RPC is wired up, the result shapes
// here should be reconciled with the real DB-derived phrase types.

export const ChatTranslationSchema = z.object({
	id: z.string(),
	lang: z.string(),
	text: z.string(),
})
export type ChatTranslationType = z.infer<typeof ChatTranslationSchema>

export const ChatResultPhraseSchema = z.object({
	id: z.string(),
	lang: z.string(),
	text: z.string(),
	score: z.number(),
	translations: z.array(ChatTranslationSchema),
})
export type ChatResultPhraseType = z.infer<typeof ChatResultPhraseSchema>

export const ChatQuerySchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('text'), text: z.string() }),
	z.object({
		kind: z.literal('anchor'),
		pids: z.array(z.string()),
		label: z.string(),
	}),
])
export type ChatQueryType = z.infer<typeof ChatQuerySchema>

export const ChatTurnSchema = z.object({
	id: z.string(),
	lang: z.string(),
	query: ChatQuerySchema,
	results: z.array(ChatResultPhraseSchema).nullable(),
})
export type ChatTurnType = z.infer<typeof ChatTurnSchema>
