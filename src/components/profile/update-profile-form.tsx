import type { ProfileFull, uuid } from '@/types/main'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import { ShowAndLogError } from '@/components/errors'
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
	avatar_path: z.string().nullable(),
})

type ProfileEditFormInputs = z.infer<typeof ProfileEditFormSchema>

export default function UpdateProfileForm({
	profile,
}: {
	profile: ProfileFull
}) {
	const queryClient = useQueryClient()
	const initialData: ProfileEditFormInputs = {
		username: profile.username ?? '',
		language_primary: profile.language_primary,
		languages_spoken: profile.languages_spoken,
		avatar_path: profile.avatar_path,
	}
	const uid: uuid = profile.uid

	const updateProfile = useMutation({
		mutationFn: async (values: ProfileEditFormInputs) => {
			const { data } = await supabase
				.from('user_profile')
				.update(values)
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
		formState: { errors, isSubmitting, isValid, isDirty },
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
				<AvatarEditorField error={errors.avatar_path} control={control} />
				<div className="flex flex-col-reverse">
					<Button disabled={updateProfile.isPending || !isValid || !isDirty}>
						Save changes
					</Button>
				</div>
				<ShowAndLogError
					error={updateProfile.error}
					values={{
						...updateProfile.variables,
						languages_spoken:
							updateProfile.variables?.languages_spoken?.join(', ') ?? '',
					}}
					text="Error trying to update your profile"
				/>
			</fieldset>
		</form>
	)
}
