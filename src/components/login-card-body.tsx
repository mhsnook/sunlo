import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import * as z from 'zod'
import { toastSuccess } from '@/components/ui/sonner'

import { buttonVariants } from '@/components/ui/button'
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

function InvalidCredentialsError() {
	return (
		<div
			role="alert"
			data-testid="login-error-invalid-credentials"
			className="animate-shake flex items-center gap-2"
		>
			<span className="hue-danger bg-5-mhi flex size-7 shrink-0 items-center justify-center rounded-full">
				<X className="size-4 text-white" aria-hidden={true} />
			</span>
			<strong className="text-7-mhi-danger">
				Incorrect email or password. Try again?
			</strong>
		</div>
	)
}

export function LoginCardBody({
	onSuccess,
}: {
	onSuccess?: (email: string | undefined) => void
}) {
	// Bumped on every failed attempt so the error re-keys and replays its
	// shake animation — even when the user resubmits without editing anything.
	const [failedAttempts, setFailedAttempts] = useState(0)

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
		onError: () => setFailedAttempts((n) => n + 1),
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
				<InvalidCredentialsError key={failedAttempts} />
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
