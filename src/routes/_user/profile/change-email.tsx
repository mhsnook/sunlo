import { createFileRoute, Link } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { useAppForm } from '@/components/form'

export const Route = createFileRoute('/_user/profile/change-email')({
	component: ChangeEmailPage,
})

const FormSchema = z.object({
	email: z
		.string()
		.min(1, `Enter a new email`)
		.email(`Email is required to be a real email`),
})

type FormInputs = z.infer<typeof FormSchema>

function ChangeEmailPage() {
	const changeMutation = useMutation({
		mutationKey: ['change-email'],
		mutationFn: async ({ email }: FormInputs) => {
			const { error } = await supabase.auth.updateUser(
				{ email },
				{
					emailRedirectTo: `${window.location.origin}/profile/change-email-confirm`,
				}
			)
			if (error) {
				console.log(`Error`, error)
				throw error
			}
			return { email }
		},
		onSuccess: () => {
			toastSuccess(
				`Request submitted. Please find the confirmation in your email.`
			)
		},
	})

	const form = useAppForm({
		defaultValues: { email: '' },
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			await changeMutation.mutateAsync(value)
		},
	})

	return (
		<Card className="mt-6 max-w-100">
			<CardHeader>
				<CardTitle>Change your registered email</CardTitle>
			</CardHeader>
			<CardContent>
				{changeMutation.isSuccess ? (
					<Callout Icon={SuccessCheckmarkTrans}>
						<p>Step 1 complete:</p>
						<p>
							You've requested to change your email to{' '}
							<strong>{changeMutation.data?.email}</strong>.
						</p>
						<p>
							Please check your new email for a confirmation link to confirm the
							change.
						</p>
					</Callout>
				) : (
					<form
						data-testid="change-email-form"
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
							<form.AppField name="email">
								{(field) => <field.EmailInput />}
							</form.AppField>
						</div>
						<div className="flex flex-row justify-between">
							<form.AppForm>
								<form.SubmitButton pendingText="Submitting...">
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
								text="Problem changing registered email"
								error={changeMutation.error}
							/>
						</form.AppForm>
					</form>
				)}
			</CardContent>
		</Card>
	)
}
