import type { Tables } from '@/types/supabase'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import languages from '@/lib/languages'
import { decksCollection } from '@/lib/collections'
import { DeckMetaSchema } from '@/lib/schemas'

async function postNewDeck(lang: string) {
	// console.log(`postNewDeck ${lang}`)
	if (typeof lang !== 'string' || lang.length !== 3)
		throw new Error('Form not right. Maybe refresh. Or tell the devs.')
	const { data, error } = await supabase
		.from('user_deck')
		.insert({ lang })
		.select()
	// console.log(`postNewDeck`, data, error)
	if (error) throw error
	return data[0] as Tables<'user_deck'>
}

export const useNewDeckMutation = () => {
	const navigate = useNavigate()

	const mutation = useMutation({
		mutationFn: async (variables: { lang: string }) => {
			return await postNewDeck(variables.lang)
		},
		mutationKey: ['new-deck'],
		onSuccess: (deck, variables) => {
			decksCollection.utils.writeInsert(DeckMetaSchema.parse(deck))
			// @@TODO this is only needed because we're breaking the 'ignorance' of the deck query
			// by adding the theme (calculating it w/r/t the entire array, not atomic)
			void decksCollection.utils.refetch()
			toast.success(`Created a new deck to learn ${languages[variables.lang]}`)
			void navigate({ to: `/learn/$lang`, params: { lang: variables.lang } })
		},
		onError: (error) => {
			console.log(`Error creating deck:`, error)
			toast.error(`Error creating deck: ${error.message}`)
		},
	})

	return mutation
}
