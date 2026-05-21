import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import { buttonVariants } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import supabase from '@/lib/supabase-client'
import { useAppForm } from '@/components/form'

const FormSchema = z.object({
	email: z
		.string()
		.min(1, `Email is required`)
		.email(`Email is required to be a real email`),
	password: z.string().min(1, 'Password is required'),
})

type FormInputs = z.infer<typeof FormSchema>

// Supabase returns the same error whether the email is unknown or the password
// is wrong, so the copy can't single out one or the other.
function isInvalidCredentials(error: Error | null): boolean {
	if (!error) return false
	return (
		(error as { code?: string }).code === 'invalid_credentials' ||
		error.message === 'Invalid login credentials'
	)
}

function InvalidCredentialsAlert() {
	return (
		<div data-testid="login-error-invalid-credentials">
			<Callout variant="problem" size="sm" alert Icon={KeyRoundIcon}>
				<strong>That email and password don&rsquo;t match</strong>
				<p>
					Double-check your password for typos, or{' '}
					<Link
						to="/forgot-password"
						data-testid="login-error-reset-password-link"
						className="s-link"
					>
						reset your password
					</Link>{' '}
					if you&rsquo;ve forgotten it.
				</p>
			</Callout>
		</div>
	)
}

function KeyRoundIcon() {
	return <KeyRound className="text-5-mhi" aria-hidden={true} />
}

export function LoginCardBody({
	onSuccess,
}: {
	onSuccess?: (email: string | undefined) => void
}) {
	const loginMutation = useMutation({
		mutationKey: ['login'],
		mutationFn: async ({ email, password }: FormInputs) => {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			})
			if (error) throw error
			return data.user?.email
		},
		onSuccess: (email) => {
			if (email) toastSuccess(`Logged in as ${email}`)
			onSuccess?.(email)
		},
	})

	const form = useAppForm({
		defaultValues: { email: '', password: '' },
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			await loginMutation.mutateAsync(value)
		},
	})

	return (
		<form
			data-testid="login-form"
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
					{(field) => <field.PasswordInput />}
				</form.AppField>
			</div>
			<div className="flex flex-row justify-between">
				<form.AppForm>
					<form.SubmitButton pendingText="Logging in...">
						Log in
					</form.SubmitButton>
				</form.AppForm>

				<Link
					to="/signup"
					data-testid="login-signup-link"
					className={buttonVariants({ variant: 'neutral' })}
				>
					Create account
				</Link>
			</div>
			{isInvalidCredentials(loginMutation.error) ? (
				<InvalidCredentialsAlert />
			) : (
				<form.AppForm>
					<form.FormAlert
						error={loginMutation.error}
						text="Problem logging in"
					/>
				</form.AppForm>
			)}

			<p>
				<Link
					to="/forgot-password"
					data-testid="login-forgot-password-link"
					className="s-link text-sm"
				>
					Forgot password?
				</Link>
			</p>
		</form>
	)
}
