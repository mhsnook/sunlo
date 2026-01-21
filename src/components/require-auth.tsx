import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
	Link,
	useCanGoBack,
	useNavigate,
	useRouter,
} from '@tanstack/react-router'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/components/ui/sonner'
import { ChevronLeft } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/use-auth'
import { ShowAndLogError } from '@/components/errors'
import EmailField from '@/components/fields/email-field'
import PasswordField from '@/components/fields/password-field'

interface RequireAuthProps {
	children: ReactNode
	/** Message to show explaining why login is needed */
	message?: string
}

/**
 * Wrapper component for routes that require authentication.
 * Shows an inline login form with back button instead of redirecting.
 */
export function RequireAuth({
	children,
	message = 'You need to be logged in to access this page.',
}: RequireAuthProps) {
	const { isAuth } = useAuth()

	if (isAuth) {
		return <>{children}</>
	}

	return <AuthGate message={message} />
}

const FormSchema = z.object({
	email: z
		.string()
		.min(1, `Email is required`)
		.email(`Email is required to be a real email`),
	password: z.string().min(1, 'Password is required'),
})

type FormInputs = z.infer<typeof FormSchema>

function AuthGate({ message }: { message: string }) {
	const navigate = useNavigate()
	const router = useRouter()
	const canGoBack = useCanGoBack()

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
		onSuccess: (email: string | undefined) => {
			if (email) {
				toast.success(`Logged in as ${email}`)
			}
			// Page will re-render and show the protected content
		},
	})

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<FormInputs>({
		resolver: zodResolver(FormSchema),
	})

	const handleGoBack = () => {
		if (canGoBack) {
			router.history.back()
		} else {
			void navigate({ to: '/learn' })
		}
	}

	return (
		<div className="flex flex-col items-center gap-6 py-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleGoBack}
							className="shrink-0"
						>
							<ChevronLeft />
							<span className="sr-only">Go back</span>
						</Button>
						<span>Login Required</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<p className="text-muted-foreground">{message}</p>

					<form
						role="form"
						noValidate
						className="space-y-4"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit((data) => loginMutation.mutate(data))}
					>
						<fieldset className="flex flex-col gap-y-4" disabled={isSubmitting}>
							<EmailField<FormInputs>
								register={register}
								error={errors.email}
							/>
							<PasswordField<FormInputs>
								register={register}
								error={errors.password}
							/>
						</fieldset>
						<div className="flex flex-row justify-between">
							<Button type="submit" disabled={isSubmitting}>
								Log in
							</Button>

							<Link
								to="/signup"
								className={buttonVariants({ variant: 'secondary' })}
							>
								Create account
							</Link>
						</div>
						<ShowAndLogError
							error={loginMutation.error}
							text="Problem logging in"
						/>

						<p>
							<Link to="/forgot-password" className="s-link text-sm">
								Forgot password?
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

// Re-export hooks from the hooks file for convenience
export { useIsAuthenticated, useRequireAuth } from '@/hooks/use-require-auth'
