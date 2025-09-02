import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import type { ProfileInsert } from '@/types/main'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import UsernameField from './fields/username-field'
import { LanguagesKnownField } from './fields/languages-known-field'

const LanguageKnownSchema = z.object({
	lang: z.string().length(3, { message: 'Please select a language' }),
	level: z.enum(['fluent', 'proficient', 'beginner']),
})

const formSchema = z.object({
	username: z
		.string()
		.min(3, 'Username should be at least 3 characters')
		.max(20, 'Username should be at most 20 characters'),
	languages_known: z
		.array(LanguageKnownSchema)
		.min(1, 'Please add at least one language you know.'),
})

type FormData = z.infer<typeof formSchema>

export default function ProfileCreationForm({ userId }: { userId: string }) {
	const queryClient = useQueryClient()

	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			languages_known: [{ lang: 'eng', level: 'fluent' }],
		},
	})

	const mainForm = useMutation({
		mutationKey: ['user', userId],
		mutationFn: async (values: ProfileInsert) => {
			const { data } = await supabase
				.from('user_profile')
				.upsert(values)
				.match({ uid: userId })
				.throwOnError()
				.select()
			return data
		},
		onSuccess: async (data) => {
			console.log(`Success! deck, profile`, data)
			toast.success('Success!')
			await queryClient.invalidateQueries({ queryKey: ['user'] })
		},
		onError: (error) => {
			console.log(`Error:`, error)
			toast.error(`there was some error: ${error.message}`)
		},
	})

	return (
		<div className="mx-auto max-w-sm space-y-8">
			<form
				noValidate
				onSubmit={handleSubmit((data) => mainForm.mutate(data))}
				className="space-y-6"
			>
				<UsernameField register={register} error={errors.username} />
				<LanguagesKnownField control={control} error={errors.languages_known} />
				<div className="flex flex-col gap-4 @xl:flex-row @xl:justify-between">
					<Button type="submit" size="lg" className="w-full @xl:w-auto">
						Save your profile
					</Button>
				</div>
			</form>
		</div>
	)
}
