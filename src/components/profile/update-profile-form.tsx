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
		username: profile.username,
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
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			toast.success(`Successfully updated your profile`)
			reset({
				username: data?.username ?? '',
				language_primary: data?.language_primary ?? '',
				languages_spoken: data?.languages_spoken ?? [],
				avatar_path: data?.avatar_path ?? null,
			})
			void queryClient.invalidateQueries({ queryKey: ['user'] })
		},
	})

	const {
		register,
		control,
		handleSubmit,
		watch,
		reset,
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
			<fieldset className="grid grid-cols-1 gap-4" disabled={isSubmitting}>
				<UsernameField<ProfileEditFormInputs>
					error={errors.username}
					register={register}
				/>
				<LanguagePrimaryField<ProfileEditFormInputs>
					error={errors.language_primary}
					control={control}
				/>
				<LanguagesSpokenField<ProfileEditFormInputs>
					// @TODO the need for [0] coercion means we're not handling the array value nicely
					error={errors.languages_spoken?.[0]}
					control={control}
					primary={watchPrimary}
				/>
				<AvatarEditorField<ProfileEditFormInputs>
					error={errors.avatar_path}
					control={control}
				/>
				<div className="flex flex-row gap-2">
					<Button
						type="submit"
						disabled={updateProfile.isPending || !isValid || !isDirty}
					>
						Save changes
					</Button>
					<Button
						type="button"
						onClick={() => reset()}
						variant="secondary"
						disabled={updateProfile.isPending || !isDirty}
					>
						Reset
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
