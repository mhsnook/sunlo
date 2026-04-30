import { Link } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import { buttonVariants } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { useAppForm } from '@/components/form'

const FormSchema = z.object({
	password: z.string().min(8, 'Password should be 8 characters at least'),
})

type FormInputs = z.infer<typeof FormSchema>

export function PasswordResetForm() {
	const changeMutation = useMutation({
		mutationKey: ['password-reset'],
		mutationFn: async ({ password }: FormInputs) => {
			const { data, error } = await supabase.auth.updateUser({ password })
			if (error) {
				console.log(`Error`, error)
				throw error
			}
			return data
		},
		onSuccess: () => {
			toastSuccess(`Successfully updated your password.`)
		},
	})

	const form = useAppForm({
		defaultValues: { password: '' },
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			await changeMutation.mutateAsync(value)
		},
	})

	return (
		<CardContent>
			{changeMutation.isSuccess ? (
				<Callout Icon={SuccessCheckmarkTrans}>
					<p>Success!</p>
					<p>You've changed your password.</p>
					<p>
						<Link to="/profile" className="s-link">
							Return to your profile page.
						</Link>
					</p>
				</Callout>
			) : (
				<form
					data-testid="password-reset-form"
					role="form"
					noValidate
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						void form.handleSubmit()
					}}
				>
					<div className="flex flex-col gap-y-4">
						<form.AppField name="password">
							{(field) => <field.PasswordInput autoComplete="new-password" />}
						</form.AppField>
					</div>
					<div className="flex flex-row justify-between">
						<form.AppForm>
							<form.SubmitButton pendingText="Updating...">
								Submit
							</form.SubmitButton>
						</form.AppForm>
						<Link
							to="/profile"
							className={buttonVariants({ variant: 'neutral' })}
						>
							Back to profile
						</Link>
					</div>
					<form.AppForm>
						<form.FormAlert
							error={changeMutation.error}
							text="Problem changing password"
						/>
					</form.AppForm>
				</form>
			)}
		</CardContent>
	)
}
