import { type FormEvent, useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/login')({
	beforeLoad: async () => {
		// getUser asks the auth server, and drops a stored session that the
		// server has ended. getSession would trust it and loop back here.
		const { data } = await supabase.auth.getUser()
		if (data.user) throw redirect({ to: '/' })
	},
	component: LoginPage,
})

function LoginPage() {
	const navigate = useNavigate()
	const [error, setError] = useState<string | null>(null)
	const [isPending, setIsPending] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		setIsPending(true)
		setError(null)
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email: form.get('email') as string,
			password: form.get('password') as string,
		})
		setIsPending(false)
		if (signInError) {
			setError(signInError.message)
			return
		}
		void navigate({ to: '/' })
	}

	return (
		<main className="mx-auto w-full max-w-sm px-4 pt-[15dvh]">
			<Card>
				<CardHeader>
					<CardTitle>Sunlo Admin</CardTitle>
					<CardDescription>
						Sign in with your Sunlo account. Only admin accounts can open the
						dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(event) => void handleSubmit(event)}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
							/>
						</div>
						{error && (
							<p role="alert" className="text-danger-700 text-sm">
								{error}
							</p>
						)}
						<Button type="submit" disabled={isPending} className="w-full">
							{isPending ? 'Signing in…' : 'Sign in'}
						</Button>
						<p className="text-muted-foreground text-sm">
							Forgot your password?{' '}
							<a className="underline" href="https://sunlo.app/forgot-password">
								Reset it on sunlo.app
							</a>
						</p>
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
