import { createFileRoute, Link } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import Callout from '@/components/ui/callout'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShowError } from '@/components/errors'
import { EmailField } from '@/components/fields'
import SuccessCheckmark from '@/components/SuccessCheckmark'

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
			toast.success(
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
		<>
			<CardHeader>
				<CardTitle>Recover your password</CardTitle>
			</CardHeader>
			<CardContent>
				{recoveryMutation.isSuccess ?
					<Callout Icon={() => <SuccessCheckmark className="bg-transparent" />}>
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
						onSubmit={handleSubmit(
							recoveryMutation.mutate as SubmitHandler<FormInputs>
						)}
					>
						<fieldset className="flex flex-col gap-y-4" disabled={isSubmitting}>
							<EmailField
								register={register}
								error={errors.email}
								autoFocus
								tabIndex={1}
							/>
						</fieldset>
						<div className="flex flex-row justify-between">
							<Button disabled={recoveryMutation.isPending}>Submit</Button>
							<Link to="/login" className={buttonVariants({ variant: 'link' })}>
								Back to login
							</Link>
						</div>
						<ShowError show={!!recoveryMutation.error}>
							Problem signing up: {recoveryMutation.error?.message}
						</ShowError>
					</form>
				}
			</CardContent>
		</>
	)
}
