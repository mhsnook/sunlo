import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toastSuccess } from '@/components/ui/sonner'

import supabase from '@/lib/supabase-client'
import { Button, buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShowAndLogError } from '@/components/errors'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import EmailField from '@/components/fields/email-field'

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
			// console.log(`form data`, email, user_role)
			// return { user: { email: '@fake email@' } }
		},
		onSuccess: (email) => {
			toastSuccess(
				`Password recovery email sent to ${email}. Please check your email to confirm.`
			)
		},
	})

	const {
		handleSubmit,
		register,
		formState: { errors, isSubmitting },
	} = useForm<FormInputs>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			email: '',
		},
	})

	return (
		<Card className="mx-auto mt-[10cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]">
			<CardHeader>
				<CardTitle>Recover your password</CardTitle>
			</CardHeader>
			<CardContent>
				{recoveryMutation.isSuccess ?
					<Callout Icon={SuccessCheckmarkTrans}>
						<p>Almost done!</p>
						<p>
							Find the password reset link in your email to set a new password.
						</p>
						<p>You can close this window.</p>
					</Callout>
				:	<form
						role="form"
						noValidate
						className="space-y-4"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit((data) => recoveryMutation.mutate(data))}
					>
						<fieldset className="flex flex-col gap-y-4" disabled={isSubmitting}>
							<EmailField<FormInputs>
								register={register}
								error={errors.email}
								// oxlint-disable-next-line tabindex-no-positive
								tabIndex={1}
							/>
						</fieldset>
						<div className="flex flex-row justify-between">
							<Button disabled={recoveryMutation.isPending}>Submit</Button>
							<Link
								to="/login"
								className={buttonVariants({ variant: 'secondary' })}
							>
								Back to login
							</Link>
						</div>
						<ShowAndLogError
							error={recoveryMutation.error}
							text="There was an uncaught error while submitting your request"
							values={recoveryMutation.variables}
						/>
					</form>
				}
			</CardContent>
		</Card>
	)
}
