import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import type { FeedbackFormType } from './schemas'

// No collection holds feedback. Never add .select() to the insert: a
// signed-out sender has no SELECT policy, so the whole insert would fail.
export function useSendFeedback() {
	return useMutation({
		mutationKey: ['feedback', 'send'],
		mutationFn: async (
			input: FeedbackFormType & { page_url: string | null }
		) => {
			const { error } = await supabase.from('feedback').insert({
				kind: input.kind,
				message: input.message,
				lang: input.lang || null,
				contact_email: input.contact_email || null,
				page_url: input.page_url,
			})
			if (error) throw error
		},
	})
}
