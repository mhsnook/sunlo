import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import supabase from '@/lib/supabase-client'
import { buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { useAppForm } from '@/components/form'

export const Route = createFileRoute('/_auth/forgot-password')({
	component: ForgotPasswordPage,
})

const FormSchema = z.object({
	email: z
		.string()
		.min(1, `Email is required`)
		.email(`Email is required to be a real email`),
})

type FormInputs = z.infer<typeof FormSchema>

function ForgotPasswordPage() {
	const recoveryMutation = useMutation({
		mutationKey: ['forgot-password'],
		mutationFn: async ({ email }: FormInputs) => {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/set-new-password`,
			})
			if (error) {
				console.log(`Error`, error)
				throw error
			}
			return email
		},
		onSuccess: (email) => {
			toastSuccess(
				`Password recovery email sent to ${email}. Please check your email to confirm.`
			)
		},
	})

	const form = useAppForm({
		defaultValues: { email: '' },
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			await recoveryMutation.mutateAsync(value)
		},
	})

	return (
		<Card className="mx-auto mt-[10cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]">
			<CardHeader>
				<CardTitle>Recover your password</CardTitle>
			</CardHeader>
			<CardContent>
				{recoveryMutation.isSuccess ? (
					<Callout Icon={SuccessCheckmarkTrans}>
						<p>Almost done!</p>
						<p>
							Find the password reset link in your email to set a new password.
						</p>
						<p>You can close this window.</p>
					</Callout>
				) : (
					<form
						data-testid="forgot-password-form"
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
								<form.SubmitButton pendingText="Sending...">
									Submit
								</form.SubmitButton>
							</form.AppForm>
							<Link
								to="/login"
								className={buttonVariants({ variant: 'neutral' })}
							>
								Back to login
							</Link>
						</div>
						<form.AppForm>
							<form.FormAlert
								error={recoveryMutation.error}
								text="There was an uncaught error while submitting your request"
								values={recoveryMutation.variables ?? null}
							/>
						</form.AppForm>
					</form>
				)}
			</CardContent>
		</Card>
	)
}
