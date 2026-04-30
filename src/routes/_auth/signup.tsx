import {
	Link,
	Navigate,
	createFileRoute,
	redirect,
} from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toastSuccess } from '@/components/ui/sonner'

import { Button, buttonVariants } from '@/components/ui/button'
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
import { ShowAndLogError } from '@/components/errors'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { UnderConstructionNotice } from '../-homepage/under-construction'
import EmailField from '@/components/fields/email-field'
import PasswordField from '@/components/fields/password-field'
import { UserRoleField } from './-user-role-field'

const SearchSchema = z.object({
	referrer: z.string().uuid().optional(),
	lang: z.string().length(3).optional(),
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
	const { referrer, lang } = Route.useSearch()
	const { isAuth, isReady } = useAuth()
	const navigate = Route.useNavigate()

	const signupMutation = useMutation({
		mutationKey: ['signup'],
		mutationFn: async ({ email, password, user_role }: FormInputs) => {
			const redirectParams = new URLSearchParams()
			if (referrer) redirectParams.set('referrer', referrer)
			if (lang) redirectParams.set('lang', lang)
			const redirectQuery = redirectParams.toString()
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/getting-started${redirectQuery ? `?${redirectQuery}` : ''}`,
					data: {
						role: user_role || 'learner',
					},
				},
			})
			if (error) {
				// If user already exists, try to log them in instead
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
				void navigate(
					lang ? { to: '/learn/add-deck', search: { lang } } : { to: '/learn' }
				)
			} else {
				toastSuccess(
					`Account created for ${data.user?.email}. Please check your email to confirm.`
				)
			}
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

	// Redirect if already logged in (either from wasLogin or regular auth state)
	if (isReady && isAuth) {
		console.log(
			`Issuing redirect from Signup component to /getting-started because auth.isAuth has become true`
		)
		return (
			<Navigate
				to="/getting-started"
				from={Route.fullPath}
				search={lang ? { lang } : {}}
			/>
		)
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
							role="form"
							noValidate
							className="space-y-4"
							// eslint-disable-next-line @typescript-eslint/no-misused-promises
							onSubmit={handleSubmit((data) => signupMutation.mutate(data))}
						>
							<fieldset
								className="flex flex-col gap-y-4"
								disabled={isSubmitting}
							>
								<EmailField<FormInputs>
									register={register}
									error={errors.email}
								/>
								<PasswordField<FormInputs>
									register={register}
									error={errors.password}
								/>
								<UserRoleField<FormInputs>
									control={control}
									error={errors.user_role}
								/>
							</fieldset>
							<div className="flex flex-row justify-between">
								<Button disabled={signupMutation.isPending}>Sign Up</Button>
								<Link
									to="/login"
									className={buttonVariants({ variant: 'neutral' })}
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
