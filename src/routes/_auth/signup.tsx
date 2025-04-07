import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { EmailField, PasswordField, UserRoleField } from '@/components/fields'

import supabase from '@/lib/supabase-client'
import { ShowError } from '@/components/errors'
import SuccessCheckmark from '@/components/SuccessCheckmark'
import { uuid } from '@/types/main'

type SignUpProps = {
	referrer?: uuid
}

export const Route = createFileRoute('/_auth/signup')({
	validateSearch: (search: Record<string, unknown>): SignUpProps => {
		return {
			referrer: (search.referrer as uuid) || undefined,
		}
	},
	component: SignUp,
})

const FormSchema = z.object({
	email: z
		.string()
		.min(1, `Email is required`)
		.email(`Email is required to be a real email`),
	password: z.string().min(8, 'Password should be 8 characters at least'),
	user_role: z.enum(['learner', 'helper', 'both'], {
		message: `Let us know how you'll use the app`,
	}),
})

type FormInputs = z.infer<typeof FormSchema>

function SignUp() {
	const { referrer } = Route.useSearch()
	const signupMutation = useMutation({
		mutationKey: ['signup'],
		mutationFn: async ({ email, password, user_role }: FormInputs) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/getting-started${referrer ? `?referrer=${referrer}` : ''}`,
					data: {
						role: user_role || 'learner',
					},
				},
			})
			if (error) {
				console.log(`Error`, error)
				throw error
			}
			return data
			// console.log(`form data`, email, user_role)
			// return { user: { email: '@fake email@' } }
		},
		onSuccess: (data) => {
			console.log(`Signup form response data`, data)
			toast.success(
				`Account created for ${data.user?.email}. Please check your email to confirm.`
			)
		},
	})

	const {
		handleSubmit,
		register,
		control,
		formState: { errors, isSubmitting },
	} = useForm<FormInputs>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			email: '',
			password: '',
			user_role: 'learner',
		},
	})

	return (
		<>
			<CardHeader>
				<CardTitle>Sign Up</CardTitle>
			</CardHeader>
			<CardContent>
				{signupMutation.isSuccess ?
					<Callout>
						<SuccessCheckmark className="bg-transparent" />
						<div className="space-y-2">
							<p>Almost done!</p>
							<p>
								Find the confirmation link in your email to activate your
								account.
							</p>
							<p>You can close this window.</p>
						</div>
					</Callout>
				:	<form
						role="form"
						noValidate
						className="space-y-4"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit(
							signupMutation.mutate as SubmitHandler<FormInputs>
						)}
					>
						<fieldset className="flex flex-col gap-y-4" disabled={isSubmitting}>
							<EmailField
								register={register}
								error={errors.email}
								autoFocus
								tabIndex={1}
							/>
							<PasswordField
								register={register}
								error={errors.password}
								tabIndex={2}
							/>
							<UserRoleField
								control={control}
								error={errors.user_role}
								tabIndex={3}
							/>
						</fieldset>
						<div className="flex flex-row justify-between">
							<Button disabled={signupMutation.isPending}>Sign Up</Button>
							<Link to="/login" className={buttonVariants({ variant: 'link' })}>
								Already have an account?
							</Link>
						</div>
						<ShowError show={!!signupMutation.error}>
							Problem signing up: {signupMutation.error?.message}
						</ShowError>
					</form>
				}
			</CardContent>
		</>
	)
}
