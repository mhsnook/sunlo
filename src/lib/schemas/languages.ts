import * as z from 'zod'
import { LangSchema } from './shared'

export const LangTagSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	name: z.string(),
	lang: LangSchema,
	added_by: z.string().uuid(),
})

export type LangTagType = z.infer<typeof LangTagSchema>

export const PhraseTagSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
})

export type PhraseTagType = z.infer<typeof PhraseTagSchema>

export const LanguageSchema = z.object({
	lang: LangSchema,
	alias_of: z.string().length(3).nullable(),
	name: z.string(),
	learners: z.number().default(0),
	phrases_to_learn: z.number().default(0),
	rank: z.number().nullable(),
	display_order: z.number().nullable(),
})

export type LanguageType = z.infer<typeof LanguageSchema>
