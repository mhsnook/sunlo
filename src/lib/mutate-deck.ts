import type { Tables } from '@/types/supabase'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import languages from '@/lib/languages'
import { decksCollection } from '@/lib/collections'
import { DeckMetaSchema } from '@/lib/schemas'
import { useDecks } from '@/hooks/use-deck'

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
	const countDecks = useDecks().data?.length ?? 0
	const mutation = useMutation({
		mutationFn: async (variables: { lang: string }) => {
			console.log(`mutationFn ${variables.lang}`)

			return await postNewDeck(variables.lang)
		},
		mutationKey: ['new-deck'],
		onSuccess: (deck, variables) => {
			console.log(`onSuccess ${variables.lang}`)

			const deck2 = {
				...deck,
				language: languages[deck.lang],
				theme: countDecks % 5,
			}

			decksCollection.utils.writeInsert(DeckMetaSchema.parse(deck2))

			void navigate({
				to: `/learn/$lang`,
				params: { lang: variables.lang },
			}).then(() =>
				toast.success(
					`Created a new deck to learn ${languages[variables.lang]}`
				)
			)
		},
		onError: (error) => {
			console.log(`Error creating deck:`, error)
			toast.error(`Error creating deck: ${error.message}`)
		},
	})

	return mutation
}
