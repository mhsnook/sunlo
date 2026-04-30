import {
	Link,
	Navigate,
	createFileRoute,
	redirect,
} from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import { buttonVariants } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import Callout from '@/components/ui/callout'

import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/use-auth'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { UnderConstructionNotice } from '../-homepage/under-construction'
import { useAppForm } from '@/components/form'
import { UserRoleField } from './-user-role-field'

const SearchSchema = z.object({
	referrer: z.string().uuid().optional(),
})

type SignUpProps = z.infer<typeof SearchSchema>

export const Route = createFileRoute('/_auth/signup')({
	validateSearch: (search: Record<string, unknown>): SignUpProps => {
		const result = SearchSchema.safeParse(search)
		return result.success ? result.data : {}
	},
	beforeLoad: ({ context: { auth } }) => {
		if (auth.isAuth) {
			console.log(
				`Issuing redirect from /signup to /learn because auth.isAuth is true`
			)
			throw redirect({ to: '/learn' })
		}
		return
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
	const { isAuth, isReady } = useAuth()
	const navigate = Route.useNavigate()

	const signupMutation = useMutation({
		mutationKey: ['signup'],
		mutationFn: async ({ email, password, user_role }: FormInputs) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/getting-started${referrer ? `?referrer=${referrer}` : ''}`,
					data: { role: user_role || 'learner' },
				},
			})
			if (error) {
				if (error.message.toLowerCase().includes('already registered')) {
					const { data: loginData, error: loginError } =
						await supabase.auth.signInWithPassword({ email, password })
					if (loginError) throw loginError
					return { user: loginData.user, wasLogin: true }
				}
				console.log(`Error`, error)
				throw error
			}
			return { user: data.user, wasLogin: false }
		},
		onSuccess: (data) => {
			if (data.wasLogin) {
				toastSuccess(`Welcome back! Logged in as ${data.user?.email}`)
				void navigate({ to: '/learn' })
			} else {
				toastSuccess(
					`Account created for ${data.user?.email}. Please check your email to confirm.`
				)
			}
		},
	})

	const form = useAppForm({
		defaultValues: {
			email: '',
			password: '',
			user_role: 'learner',
		} as FormInputs,
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			await signupMutation.mutateAsync(value)
		},
	})

	if (isReady && isAuth) {
		console.log(
			`Issuing redirect from Signup component to /getting-started because auth.isAuth has become true`
		)
		return <Navigate to="/getting-started" from={Route.fullPath} />
	}

	return (
		<>
			{signupMutation.isSuccess ? null : <UnderConstructionNotice />}
			<Card className="mx-auto mt-[1cqh] w-full max-w-md p-[clamp(0.5rem,2cqw,2rem)]">
				<CardHeader>
					<CardTitle>Sign Up</CardTitle>
				</CardHeader>
				<CardContent>
					{signupMutation.isSuccess ? (
						<Callout Icon={SuccessCheckmarkTrans}>
							<p>Almost done!</p>
							<p>
								Find the confirmation link in your email to activate your
								account.
							</p>
							<p>You can close this window.</p>
						</Callout>
					) : (
						<form
							data-testid="signup-form"
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
								<form.AppField name="password">
									{(field) => (
										<field.PasswordInput autoComplete="new-password" />
									)}
								</form.AppField>
								<form.AppField name="user_role">
									{() => <UserRoleField />}
								</form.AppField>
							</div>
							<div className="flex flex-row justify-between">
								<form.AppForm>
									<form.SubmitButton pendingText="Signing up...">
										Sign Up
									</form.SubmitButton>
								</form.AppForm>
								<Link
									to="/login"
									className={buttonVariants({ variant: 'neutral' })}
								>
									Already have an account?
								</Link>
							</div>
							<form.AppForm>
								<form.FormAlert
									error={signupMutation.error}
									values={signupMutation.variables ?? null}
									text="Problem signing up"
								/>
							</form.AppForm>
						</form>
					)}
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
