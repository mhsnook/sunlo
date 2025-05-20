import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { ProfileInsert } from '@/types/main'
import { LanguagePrimaryField, UsernameField } from '@/components/fields'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import toast from 'react-hot-toast'

const formSchema = z.object({
	username: z
		.string()
		.min(3, 'Username should be at least 3 characters')
		.max(20, 'Username should be at most 20 characters'),
	language_primary: z
		.string()
		.length(3, { message: 'Please select a language' }),
})

type FormData = z.infer<typeof formSchema>

export default function ProfileCreationForm({ userId }: { userId: string }) {
	const queryClient = useQueryClient()

	const {
		control,
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(formSchema),
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
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit(mainForm.mutate as SubmitHandler<FormData>)}
				className="space-y-6"
			>
				<UsernameField register={register} error={errors.username} />
				<LanguagePrimaryField
					control={control}
					error={errors.language_primary}
				/>
				<div className="flex flex-col gap-4 @xl:flex-row @xl:justify-between">
					<Button type="submit" className="w-full @xl:w-auto">
						Confirm
					</Button>
				</div>
			</form>
		</div>
	)
}
