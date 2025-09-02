import * as z from 'zod'

export const LanguageKnownSchema = z.object({
	lang: z.string().length(3, { message: 'Please select a language' }),
	level: z.enum(['fluent', 'proficient', 'beginner']),
})

export const LanguagesKnownSchema = z
	.array(LanguageKnownSchema)
	.min(1, 'Please add at least one language you know.')
