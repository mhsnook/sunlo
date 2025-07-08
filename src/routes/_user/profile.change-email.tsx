import { createFileRoute, Link } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { ShowAndLogError } from '@/components/errors'
import { EmailField } from '@/components/fields'

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
		mutationKey: ['forgot-password'],
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
			toast.success(
				`Request submitted. Please find the confirmation in your email.`
			)
		},
	})

	const {
		handleSubmit,
		register,
		formState: { errors, isSubmitting, isValid },
	} = useForm<FormInputs>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			email: '',
		},
	})

	return (
		<>
			<CardHeader>
				<CardTitle>Change your registered email</CardTitle>
			</CardHeader>
			<CardContent>
				{changeMutation.isSuccess ?
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
				:	<form
						role="form"
						noValidate
						className="space-y-4"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit(
							changeMutation.mutate as SubmitHandler<FormInputs>
						)}
					>
						<fieldset className="flex flex-col gap-y-4" disabled={isSubmitting}>
							<EmailField<FormInputs>
								register={register}
								error={errors.email}
								autoFocus
								tabIndex={1}
							/>
						</fieldset>
						<div className="flex flex-row justify-between">
							<Button disabled={changeMutation.isPending || !isValid}>
								Submit
							</Button>
							<Link
								to="/profile"
								className={buttonVariants({ variant: 'link' })}
							>
								Back to profile
							</Link>
						</div>
						<ShowAndLogError
							text="Problem changing registered email"
							error={changeMutation.error}
						/>
					</form>
				}
			</CardContent>
		</>
	)
}
