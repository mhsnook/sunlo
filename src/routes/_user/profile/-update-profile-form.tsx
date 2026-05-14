import type { uuid } from '@/types/main'
import * as z from 'zod'

import { LanguagesKnownSchema, MyProfileType } from '@/features/profile/schemas'
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

	const form = useAppForm({
		defaultValues: initialData,
		validators: { onChange: ProfileEditFormSchema },
		onSubmit: ({ value, formApi }) => {
			// Fire-and-forget: optimistic profile change shows instantly. The
			// onUpdate handler in myProfileCollection owns the error toast; on
			// rollback the previous values come back via useLiveQuery.
			myProfileCollection.update(uid, (draft) => {
				draft.username = value.username
				draft.avatar_path = value.avatar_path ?? ''
				draft.languages_known = value.languages_known
			})
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
			</div>
		</form>
	)
}
