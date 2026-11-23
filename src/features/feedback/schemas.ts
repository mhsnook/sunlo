import * as z from 'zod'

export const FeedbackKindSchema = z.enum(['bug', 'feature', 'library'])
export type FeedbackKindType = z.infer<typeof FeedbackKindSchema>

export const FEEDBACK_MESSAGE_MAX = 4000

export const FeedbackFormSchema = z.object({
	kind: FeedbackKindSchema,
	message: z
		.string()
		.trim()
		.min(1, 'Tell us what happened, or what you need')
		.max(
			FEEDBACK_MESSAGE_MAX,
			`Keep it under ${FEEDBACK_MESSAGE_MAX} characters`
		),
	lang: z.string().length(3).or(z.literal('')),
	contact_email: z
		.email('Enter a real email, or leave it empty')
		.or(z.literal('')),
})
export type FeedbackFormType = z.infer<typeof FeedbackFormSchema>
