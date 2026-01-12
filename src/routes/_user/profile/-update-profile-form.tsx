import type { uuid } from '@/types/main'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import { ShowAndLogError } from '@/components/errors'
import {
	LanguagesKnownSchema,
	LanguagesKnownType,
	MyProfileSchema,
	MyProfileType,
} from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import UsernameField from '@/components/fields/username-field'
import { LanguagesKnownField } from '@/components/fields/languages-known-field'
import { AvatarEditorField } from '@/routes/_user/profile/-avatar-editor-field'
import { myProfileCollection } from '@/lib/collections'

const ProfileEditFormSchema = z.object({
	username: z
		.string()
		.min(3, { message: 'Username must be 3 letters or more' }),
	languages_known: LanguagesKnownSchema,
	avatar_path: z.string().nullable().optional(),
})

type ProfileEditFormInputs = z.infer<typeof ProfileEditFormSchema>

export function UpdateProfileForm({ profile }: { profile: MyProfileType }) {
	const initialData: ProfileEditFormInputs = {
		username: profile.username,
		avatar_path: profile.avatar_path,
		languages_known: profile.languages_known,
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
			if (data)
				myProfileCollection.utils.writeUpdate(MyProfileSchema.parse(data))
			reset({
				username: data?.username ?? '',
				avatar_path: data?.avatar_path ?? null,
				languages_known: (data?.languages_known as LanguagesKnownType) ?? [],
			})
			toast.success(`Successfully updated your profile`)
		},
	})

	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<ProfileEditFormInputs>({
		resolver: zodResolver(ProfileEditFormSchema),
		defaultValues: initialData,
	})

	return (
		<form
			noValidate
			className="space-y-4"
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={handleSubmit((data) => updateProfile.mutate(data))}
		>
			<fieldset className="grid grid-cols-1 gap-4" disabled={isSubmitting}>
				<UsernameField<ProfileEditFormInputs>
					error={errors.username}
					register={register}
				/>
				<LanguagesKnownField<ProfileEditFormInputs>
					control={control}
					error={errors.languages_known}
				/>
				<AvatarEditorField<ProfileEditFormInputs>
					error={errors.avatar_path}
					control={control}
				/>
				<div className="flex flex-row gap-2">
					<Button type="submit" disabled={updateProfile.isPending || !isDirty}>
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
						languages_known: JSON.stringify(
							updateProfile.variables?.languages_known
						),
					}}
					text="Error trying to update your profile"
				/>
			</fieldset>
		</form>
	)
}
