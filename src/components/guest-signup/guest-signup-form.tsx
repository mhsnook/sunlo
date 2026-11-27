import { useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { should } from '@scenetest/checks/react'
import * as z from 'zod'

import Callout from '@/components/ui/callout'
import { Button } from '@/components/ui/button'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { useAppForm } from '@/components/form'
import {
	UserRoleField,
	UserRoleSchema,
} from '@/components/fields/user-role-field'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/use-auth'
import { UsernameSchema } from '@/features/profile/schemas'

const GuestSignupSchema = z.object({
	email: z
		.string()
		.min(1, `Email is required`)
		.email(`Email is required to be a real email`),
	username: z.string().trim().pipe(UsernameSchema),
	user_role: UserRoleSchema,
})

type GuestSignupInputs = z.infer<typeof GuestSignupSchema>

// A guest's username change is refused until they confirm their email
// (guard_anonymous_profile), so the name waits in the auth user's metadata.
// createGuestNameClaim (guest-name-claim.ts) writes it to the profile afterwards.
async function convertGuest(
	{ email, username, user_role }: GuestSignupInputs,
	referrer: string | undefined
) {
	const { data: taken } = await supabase
		.from('public_profile')
		.select('uid')
		.eq('username', username)
		.maybeSingle()
		.throwOnError()
	if (taken)
		throw new Error(
			`Someone on Sunlo already uses the name “${username}”. Try another.`
		)
	// Keeps the uid, so the deck and the coach conversation carry over.
	// Supabase refuses a password until the email is verified, so the
	// confirmation link goes to the page that sets one.
	const redirect = new URL('/set-new-password', window.location.origin)
	if (referrer) redirect.searchParams.set('referrer', referrer)
	const { data, error } = await supabase.auth.updateUser(
		{ email, data: { role: user_role, username } },
		{ emailRedirectTo: redirect.href }
	)
	if (error) throw error
	should(
		'guest sign-up saves the chosen role',
		data.user.user_metadata.role === user_role,
		{ submitted: user_role, returned: data.user.user_metadata.role }
	)
	return data.user
}

/**
 * Turns a guest (an anonymous user) into an account: an email and a display
 * name, then a confirmation link. Every place that asks a guest to sign up
 * renders this form. Without `askRole` the account is a learner's.
 */
export function GuestSignupForm({
	lead,
	onSkip,
	askRole = false,
	referrer,
}: {
	lead: ReactNode
	onSkip?: () => void
	askRole?: boolean
	referrer?: string
}) {
	const { pendingEmail } = useAuth()
	const [sendingAgain, setSendingAgain] = useState(false)
	const convert = useMutation({
		mutationKey: ['convert-guest'],
		mutationFn: (value: GuestSignupInputs) => convertGuest(value, referrer),
	})
	const form = useAppForm({
		defaultValues: {
			email: pendingEmail ?? '',
			username: '',
			user_role: 'learner',
		} as GuestSignupInputs,
		validators: { onChange: GuestSignupSchema },
		onSubmit: async ({ value }) => {
			await convert.mutateAsync(GuestSignupSchema.parse(value))
			setSendingAgain(false)
		},
	})

	const skipButton = onSkip ? (
		<Button
			type="button"
			variant="neutral"
			data-testid="guest-signup-skip"
			onClick={onSkip}
		>
			Not now
		</Button>
	) : null

	const sentTo = sendingAgain ? null : (convert.data?.new_email ?? pendingEmail)
	if (sentTo)
		return (
			<div data-testid="guest-signup-sent" className="space-y-4">
				<Callout Icon={SuccessCheckmarkTrans}>
					<p>Almost done!</p>
					<p>
						We sent a link to {sentTo}. Open it to confirm your email and choose
						a password.
					</p>
				</Callout>
				<div className="flex flex-row flex-wrap justify-between gap-2">
					<Button
						type="button"
						variant="neutral"
						data-testid="guest-signup-send-again"
						onClick={() => setSendingAgain(true)}
					>
						Send a new link
					</Button>
					{skipButton}
				</div>
			</div>
		)

	return (
		<form
			data-testid="guest-signup-form"
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			<div className="text-muted-foreground space-y-2 text-sm">
				<p className="text-foreground font-medium">{lead}</p>
				<p>
					Without an account you can browse and chat with the coach. To start
					learning, or to post to the public library or the activity feed, you
					need an account.
				</p>
			</div>
			<form.AppField name="email">
				{(field) => <field.EmailInput />}
			</form.AppField>
			<form.AppField name="username">
				{(field) => (
					<field.TextInput
						label="Display name"
						description="Shown with what you post to the library."
						placeholder="e.g. Learnie McLearnerson"
						autoComplete="nickname"
					/>
				)}
			</form.AppField>
			{askRole ? (
				<form.AppField name="user_role">
					{() => <UserRoleField />}
				</form.AppField>
			) : null}
			<p className="text-muted-foreground text-sm">
				We'll send you a link to confirm your email. Your deck and your coach
				conversation stay with you.
			</p>
			<div className="flex flex-row flex-wrap justify-between gap-2">
				<form.AppForm>
					<form.SubmitButton pendingText="Sending…">
						Send the link
					</form.SubmitButton>
				</form.AppForm>
				{skipButton}
			</div>
			<form.AppForm>
				<form.FormAlert
					error={convert.error}
					values={convert.variables ?? null}
					text="Problem creating your account"
				/>
			</form.AppForm>
		</form>
	)
}
