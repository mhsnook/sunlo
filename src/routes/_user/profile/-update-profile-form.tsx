import type { uuid } from '@/types/main'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import supabase from '@/lib/supabase-client'
import {
	LanguagesKnownSchema,
	MyProfileSchema,
	MyProfileType,
} from '@/features/profile/schemas'
import { Button } from '@/components/ui/button'
import { LanguagesKnownField } from '@/components/fields/languages-known-field'
import { AvatarEditorField } from '@/routes/_user/profile/-avatar-editor-field'
import { myProfileCollection } from '@/features/profile/collections'
import { useAppForm } from '@/components/form'

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
			toastSuccess(`Successfully updated your profile`)
		},
	})

	const form = useAppForm({
		defaultValues: initialData,
		validators: { onChange: ProfileEditFormSchema },
		onSubmit: async ({ value, formApi }) => {
			await updateProfile.mutateAsync(value)
			formApi.reset(value)
		},
	})

	return (
		<form
			data-testid="update-profile-form"
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			<div className="grid grid-cols-1 gap-4">
				<form.AppField name="username">
					{(field) => (
						<field.TextInput
							label="Your nickname"
							description="Your username helps you find friends, and accompanies your contributions to the library."
							placeholder="e.g. Learnie McLearnerson, Helpar1992"
							inputMode="text"
						/>
					)}
				</form.AppField>
				<form.AppField name="languages_known">
					{() => <LanguagesKnownField />}
				</form.AppField>
				<form.AppField name="avatar_path">
					{() => <AvatarEditorField />}
				</form.AppField>
				<div className="flex flex-row gap-2">
					<form.AppForm>
						<form.SubmitButton pendingText="Saving...">
							Save changes
						</form.SubmitButton>
					</form.AppForm>
					<Button type="button" onClick={() => form.reset()} variant="neutral">
						Reset
					</Button>
				</div>
				<form.AppForm>
					<form.FormAlert
						error={updateProfile.error}
						text="Error trying to update your profile"
					/>
				</form.AppForm>
			</div>
		</form>
	)
}
