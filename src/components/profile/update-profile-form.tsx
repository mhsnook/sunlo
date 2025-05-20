import type { uuid } from '@/types/main'

import { Navigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'

import { Loader } from '@/components/ui/loader'
import supabase from '@/lib/supabase-client'
import { useProfile } from '@/lib/use-profile'
import { ShowError } from '@/components/errors'
import { Button } from '@/components/ui/button'
import {
	AvatarEditorField,
	LanguagePrimaryField,
	LanguagesSpokenField,
	UsernameField,
} from '@/components/fields'

const ProfileEditFormSchema = z.object({
	username: z
		.string()
		.min(3, { message: 'Username must be 3 letters or more' }),
	language_primary: z
		.string()
		.length(3, { message: 'A primary language is required' }),
	languages_spoken: z.array(z.string()),
	avatar_url: z.string().optional(),
})

type ProfileEditFormInputs = z.infer<typeof ProfileEditFormSchema>

export default function UpdateProfileForm() {
	const { data, error } = useProfile()
	// (`Profile data`, data)
	if (error) return <ShowError>{error.message}</ShowError>

	// we use placeholders for the profile, so there's no isPending
	return (
		!data ?
			data === undefined ?
				<Loader />
			:	<Navigate to={`/getting-started`} />
		:	<PrefilledForm
				initialData={{
					avatar_url: data.avatar_url,
					username: data.username,
					language_primary: data.language_primary,
					languages_spoken: data.languages_spoken,
				}}
				uid={data.uid}
			/>
	)
}

interface PrefilledFormProps {
	initialData: ProfileEditFormInputs
	uid: uuid
}

function PrefilledForm({ initialData, uid }: PrefilledFormProps) {
	const queryClient = useQueryClient()

	const updateProfile = useMutation({
		mutationFn: async (value: ProfileEditFormInputs) => {
			const { data } = await supabase
				.from('user_profile')
				.update(value)
				.eq('uid', uid)
				.select()
				.throwOnError()
			return data
		},
		onSuccess: () => {
			toast.success(`Successfully updated your profile`)
			void queryClient.invalidateQueries({ queryKey: ['user'] })
		},
	})

	const {
		register,
		control,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<ProfileEditFormInputs>({
		defaultValues: initialData,
		resolver: zodResolver(ProfileEditFormSchema),
	})

	const watchPrimary = watch('language_primary')

	return (
		<form
			noValidate
			className="space-y-4"
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={handleSubmit(
				updateProfile.mutate as SubmitHandler<ProfileEditFormInputs>
			)}
		>
			<fieldset
				className="grid grid-cols-1 gap-4 @xl:grid-cols-2"
				disabled={isSubmitting}
			>
				<UsernameField error={errors.username} register={register} />
				<LanguagePrimaryField
					error={errors.language_primary}
					control={control}
				/>
				<LanguagesSpokenField
					// @TODO the need for [0] coercion means we're not handling the array value nicely
					error={errors.languages_spoken?.[0]}
					control={control}
					primary={watchPrimary}
				/>
				<AvatarEditorField error={errors.avatar_url} control={control} />
				<div className="flex flex-col-reverse">
					<Button disabled={updateProfile.isPending}>Save changes</Button>
				</div>
				<ShowError show={!!updateProfile.error}>
					Problem updating profile: {updateProfile.error?.message}
				</ShowError>
			</fieldset>
		</form>
	)
}
