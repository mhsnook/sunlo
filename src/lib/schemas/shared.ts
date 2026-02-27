import * as z from 'zod'

export const LangSchema = z
	.string()
	.length(3, { message: 'Please select a language' })

export type LangType = z.infer<typeof LangSchema>
