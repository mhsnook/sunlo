import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import Callout from '@/components/ui/callout'

import supabase from '@/lib/supabase-client'
import { ShowAndLogError } from '@/components/errors'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { uuid } from '@/types/main'
import { UnderConstructionNotice } from '@/components/homepage/under-construction'
import EmailField from '@/components/fields/email-field'
import PasswordField from '@/components/fields/password-field'
import UserRoleField from '@/components/fields/user-role-field'

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
			{signupMutation.isSuccess ? null : <UnderConstructionNotice />}
			<Card className="mx-auto mt-[1cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]">
				<CardHeader>
					<CardTitle>Sign Up</CardTitle>
				</CardHeader>
				<CardContent>
					{signupMutation.isSuccess ?
						<Callout Icon={SuccessCheckmarkTrans}>
							<p>Almost done!</p>
							<p>
								Find the confirmation link in your email to activate your
								account.
							</p>
							<p>You can close this window.</p>
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
							<fieldset
								className="flex flex-col gap-y-4"
								disabled={isSubmitting}
							>
								<EmailField<FormInputs>
									register={register}
									error={errors.email}
									tabIndex={1}
								/>
								<PasswordField<FormInputs>
									register={register}
									error={errors.password}
									tabIndex={2}
								/>
								<UserRoleField<FormInputs>
									control={control}
									error={errors.user_role}
									tabIndex={3}
								/>
							</fieldset>
							<div className="flex flex-row justify-between">
								<Button disabled={signupMutation.isPending}>Sign Up</Button>
								<Link
									to="/login"
									className={buttonVariants({ variant: 'link' })}
								>
									Already have an account?
								</Link>
							</div>
							<ShowAndLogError
								error={signupMutation.error}
								values={signupMutation.variables}
								text="Problem signing up"
							/>
						</form>
					}
				</CardContent>
				{signupMutation.isSuccess ? null : (
					<CardFooter className="static block space-y-2 opacity-80">
						<p>
							By signing up you accept our{' '}
							<Link className="s-link" to="/privacy-policy">
								privacy policy
							</Link>
							.
						</p>
						<p className="mt-8 italic">
							Note: we are not GDPR compliant yet; if you live in the EU/EEA,
							you may have to wait till next month.
						</p>
					</CardFooter>
				)}
			</Card>
		</>
	)
}
