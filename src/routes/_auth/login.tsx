import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { ShowError } from '@/components/errors'
import { EmailField, PasswordField } from '@/components/fields'

interface LoginSearchParams {
	redirectedFrom?: string
}

export const Route = createFileRoute('/_auth/login')({
	validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
		return {
			redirectedFrom: search.redirectedFrom as string | undefined,
		}
	},
	component: LoginForm,
})

const FormSchema = z.object({
	email: z
		.string()
		.min(1, `Email is required`)
		.email(`Email is required to be a real email`),
	password: z.string().min(1, 'Password is required'),
})

type FormInputs = z.infer<typeof FormSchema>

export default function LoginForm() {
	// we use this hook instead of loader data so it reacts to the login event
	const { isAuth } = useAuth()
	const { redirectedFrom } = Route.useSearch()

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
			// we don't need to redirect here, because the <Navigate> will do that
		},
	})

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<FormInputs>({
		resolver: zodResolver(FormSchema),
	})

	// console.log('form state', form.state, loginMutation)

	if (isAuth)
		return <Navigate to={redirectedFrom || '/learn'} from={Route.fullPath} />

	return (
		<>
			<CardHeader>
				<CardTitle>Please log in</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					role="form"
					noValidate
					className="space-y-4"
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit(
						loginMutation.mutate as SubmitHandler<FormInputs>
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
					</fieldset>
					<div className="flex flex-row justify-between">
						<Button type="submit" disabled={isSubmitting} tabIndex={3}>
							Log in
						</Button>

						<Link
							to="/signup"
							from={Route.fullPath}
							className={buttonVariants({ variant: 'link' })}
							tabIndex={4}
						>
							Create account
						</Link>
					</div>
					<ShowError show={!!loginMutation.error}>
						Problem logging in: {loginMutation.error?.message}
					</ShowError>
					<p>
						<Link
							to="/forgot-password"
							from={Route.fullPath}
							className="s-link text-sm"
							tabIndex={5}
						>
							Forgot password?
						</Link>
					</p>
				</form>
			</CardContent>
		</>
	)
}
