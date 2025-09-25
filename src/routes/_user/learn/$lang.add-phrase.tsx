import { PhraseCardInsert } from '@/types/main'

import { useCallback, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useDebounce } from '@uidotdev/usehooks'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { NotebookPen, Search } from 'lucide-react'
import languages from '@/lib/languages'
import { Loader } from '@/components/ui/loader'
import supabase from '@/lib/supabase-client'
import TranslationTextField from '@/components/fields/translation-text-field'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { buttonVariants } from '@/components/ui/button-variants'

export interface SearchParams {
	text?: string
}

export const Route = createFileRoute('/_user/learn/$lang/add-phrase')({
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			text: (search?.text as string) ?? '',
		}
	},
	component: AddPhraseTab,
})

const addPhraseSchema = z.object({
	phrase_text: z.string().min(1, 'Please enter a phrase'),
	translation_lang: z
		.string()
		.length(3, 'Provide a language for the translation'),
	translation_text: z.string().min(1, 'Please enter the translation'),
})

type AddPhraseFormValues = z.infer<typeof addPhraseSchema>

function AddPhraseTab() {
	const navigate = Route.useNavigate()
	const { lang } = Route.useParams()
	const { text } = Route.useSearch()
	const searchPlusText = useCallback(
		(search: SearchParams) => ({
			...search,
			text,
		}),
		[text]
	)

	const searchPhrase = text || ''
	const {
		control,
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors },
	} = useForm<AddPhraseFormValues>({
		resolver: zodResolver(addPhraseSchema),
		defaultValues: { phrase_text: searchPhrase },
	})

	const phraseText = watch('phrase_text')
	const debouncedText = useDebounce(phraseText, 300)

	useEffect(() => {
		if (debouncedText !== text) {
			void navigate({
				replace: true,
				search: (search: SearchParams) => ({
					...search,
					text: debouncedText || undefined,
				}),
				params: true,
			})
		}
	}, [text, debouncedText, navigate])

	const addPhraseMutation = useMutation({
		mutationFn: async (variables: AddPhraseFormValues) => {
			const ins: PhraseCardInsert = { phrase_lang: lang, ...variables }
			const { data } = await supabase
				.rpc('add_phrase_translation_card', ins)
				.throwOnError()

			return data
		},
		onSuccess: (data, { translation_lang }) => {
			toast.success(
				'New phrase has been added to the public library and will appear in your next review'
			)
			console.log(`Success:`, data)
			reset({ phrase_text: '', translation_text: '', translation_lang })
		},
		onError: (error) => {
			toast.error(
				`There was an error submitting this new phrase: ${error.message}`
			)
			console.log(`Error:`, error)
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add A Phrase</CardTitle>
				<CardDescription>
					Search for a phrase or add a new one to your deck.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit((data) => addPhraseMutation.mutate(data))}
					className="mt-2 space-y-4"
				>
					<div>
						<Label htmlFor="newPhrase">
							Text of the Phrase (in {languages[lang]})
						</Label>
						<Controller
							name="phrase_text"
							control={control}
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							render={({ field }) => (
								<Textarea
									{...field}
									placeholder="The text of the phrase to learn"
								/>
							)}
						/>
					</div>
					<TranslationTextField<AddPhraseFormValues>
						error={errors.translation_text}
						register={register}
					/>
					<TranslationLanguageField<AddPhraseFormValues>
						error={errors.translation_lang}
						control={control}
					/>
					<div className="flex w-full flex-col justify-between gap-2 pt-8 @xl:flex-row">
						<Button
							type="submit"
							className={addPhraseMutation.isPending ? 'opacity-60' : ''}
							disabled={addPhraseMutation.isPending}
						>
							{addPhraseMutation.isPending ?
								<Loader />
							:	<NotebookPen />}
							Save and add another
						</Button>
						<Link
							to="/learn/$lang/search"
							from={Route.fullPath}
							search={searchPlusText}
							className={buttonVariants({ variant: 'outline' })}
						>
							<Search size={16} />
							Search phrases
						</Link>

						<Link
							to="/learn/$lang/bulk-add"
							from={Route.fullPath}
							className={buttonVariants({ variant: 'outline' })}
						>
							Bulk add phrases
						</Link>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
