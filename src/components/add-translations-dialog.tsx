import { PhraseFull } from '@/types/main'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pencil } from 'lucide-react'

import supabase from '@/lib/supabase-client'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ButtonProps } from '@/components/ui/button-variants'
import { useRef } from 'react'
import TranslationLanguageField from './fields/translation-language-field'
import TranslationTextField from './fields/translation-text-field'

const AddTranslationsInputs = z.object({
	translation_lang: z.string().length(3),
	translation_text: z.string().min(1),
})
type AddTranslationsType = z.infer<typeof AddTranslationsInputs>

export function AddTranslationsDialog({
	phrase,
	...props
}: ButtonProps & {
	phrase: PhraseFull
}) {
	const {
		handleSubmit,
		register,
		control,
		reset,
		formState: { errors, isSubmitting, isValid },
	} = useForm<AddTranslationsType>({
		defaultValues: { translation_text: '', translation_lang: 'eng' },
		resolver: zodResolver(AddTranslationsInputs),
	})
	const closeRef = useRef<HTMLButtonElement | null>(null)
	const close = () => closeRef.current?.click()
	const queryClient = useQueryClient()

	const addTranslation = useMutation({
		mutationKey: ['add-translation', phrase.id, phrase.lang],
		mutationFn: async ({
			translation_lang,
			translation_text,
		}: AddTranslationsType) => {
			const { data } = await supabase
				.from('phrase_translation')
				.insert({
					lang: translation_lang,
					text: translation_text,
					phrase_id: phrase.id!,
				})
				.throwOnError()
				.select()
			if (!data) throw new Error('Failed to add translation')
			return data[0]
		},
		onSuccess: () => {
			toast.success(`Translation added for ${phrase.text}`)
			close()
			reset()
			void queryClient.invalidateQueries({
				queryKey: ['language', phrase.lang],
			})
			void queryClient.invalidateQueries({
				queryKey: ['user', phrase.lang],
			})
		},
		onError: (error) => {
			toast.error(error.message)
		},
	})

	return (
		<Dialog>
			<DialogTrigger asChild ref={closeRef}>
				<Button {...props}>
					<Pencil className="size-4" /> Add translation
				</Button>
			</DialogTrigger>
			<DialogContent className="w-[92%] max-w-[425px]">
				<DialogHeader className="text-left">
					<DialogTitle>Add translations</DialogTitle>
					<DialogDescription className="space-y-2 text-left">
						For the phrase &ldquo;{phrase.text}&rdquo;
					</DialogDescription>
				</DialogHeader>
				<div className="text-muted-foreground space-y-2 text-sm">
					<p>Please check to make sure you're not entering a duplicate.</p>
					<ol className="space-y-2">
						{phrase.translations.map((trans) => (
							<li key={trans.id}>
								<span className="mr-2 rounded-md bg-gray-200 px-2 py-1 text-xs text-gray-700">
									{trans.lang}
								</span>
								<span>{trans.text}</span>
							</li>
						))}
					</ol>
				</div>
				<form
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit((data) => addTranslation.mutate(data))}
					noValidate
				>
					<fieldset
						className="mb-4 flex flex-col gap-4"
						disabled={isSubmitting}
					>
						<TranslationLanguageField
							control={control}
							error={errors.translation_lang}
							// oxlint-disable-next-line tabindex-no-positive
							tabIndex={1}
						/>
						<TranslationTextField
							register={register}
							error={errors.translation_text}
						/>
					</fieldset>
					<DialogFooter className="flex flex-row justify-between">
						<Button disabled={isSubmitting} variant="secondary">
							Cancel
						</Button>
						<Button disabled={isSubmitting || !isValid} variant="default">
							Add translation
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
