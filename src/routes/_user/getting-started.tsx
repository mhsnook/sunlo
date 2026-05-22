import { type CSSProperties } from 'react'
import {
	createFileRoute,
	Navigate,
	redirect,
	useNavigate,
} from '@tanstack/react-router'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import {
	FLAG_NEEDS_ONBOARDING,
	LanguagesKnownSchema,
	type MyProfileType,
} from '@/features/profile/schemas'
import { useProfile } from '@/features/profile/hooks'
import { myProfileCollection } from '@/features/profile/collections'
import { LanguagesKnownField } from '@/components/fields/languages-known-field'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { Loader } from '@/components/ui/loader'
import { useAppForm } from '@/components/form'

type GettingStartedProps = {
	referrer?: uuid
}

export const Route = createFileRoute('/_user/getting-started')({
	validateSearch: (search?: Record<string, unknown>): GettingStartedProps => {
		return search
			? {
					referrer: (search.referrer as string) || undefined,
				}
			: {}
	},
	component: GettingStartedPage,
	staticData: {
		focusMode: true,
		chromeless: true,
	},
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuth) {
			console.log(
				'Issuing redirect to /login from /getting-started page bc not logged in'
			)
			throw redirect({ to: '/login' })
		}
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function GettingStartedPage() {
	const { referrer }: GettingStartedProps = Route.useSearch()
	const { data: profile, isLoading } = useProfile()

	const nextPage = referrer ? `/friends/chats/${referrer}` : '/welcome'

	// The _user loader guarantees a profile row for authed users (it throws
	// otherwise), so !profile here is only the brief live-query load window —
	// show the loader, don't mistake it for "already onboarded" and bounce.
	if (isLoading || !profile) return <Loader />
	if (profile.flags[FLAG_NEEDS_ONBOARDING] !== true)
		return <Navigate to={nextPage} />

	return (
		<main
			className="w-app px-[5cqw] py-10"
			style={style}
			data-testid="getting-started-page"
		>
			<div className="my-4 space-y-4 text-center">
				<h1 className="d1">Welcome to Sunlo</h1>
				<div className="mx-auto inline-flex shrink flex-row items-center gap-4">
					<SuccessCheckmarkTrans />
					<p className="text-muted-foreground max-w-80 text-start text-2xl font-extralight text-balance">
						Thanks for confirming your email. Let&apos;s get you set up.
					</p>
				</div>
			</div>
			<ProfileSetupForm profile={profile} nextPage={nextPage} />
		</main>
	)
}

const formSchema = z.object({
	username: z
		.string()
		.min(3, 'Username should be at least 3 characters')
		.max(20, 'Username should be at most 20 characters'),
	languages_known: LanguagesKnownSchema,
})

type FormData = z.infer<typeof formSchema>

function ProfileSetupForm({
	profile,
	nextPage,
}: {
	profile: MyProfileType
	nextPage: string
}) {
	const navigate = useNavigate()

	const form = useAppForm({
		defaultValues: {
			username: profile.username,
			languages_known:
				profile.languages_known.length > 0
					? profile.languages_known
					: [{ lang: 'eng', level: 'fluent' }],
		} as FormData,
		validators: { onChange: formSchema },
		onSubmit: async ({ value }) => {
			const tx = myProfileCollection.update(profile.uid, (draft) => {
				draft.username = value.username
				draft.languages_known = value.languages_known
				draft.updated_at = new Date().toISOString()
				draft.flags = { ...draft.flags, [FLAG_NEEDS_ONBOARDING]: false }
			})
			try {
				await tx.isPersisted.promise
				toastSuccess('Success!')
				void navigate({ to: nextPage })
			} catch (error) {
				console.log(`Error:`, error)
				toastError(`There was an error saving your profile.`)
			}
		},
	})

	return (
		<div className="mx-auto space-y-8">
			<form
				data-testid="profile-creation-form"
				noValidate
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					void form.handleSubmit()
				}}
				className="space-y-6"
			>
				<form.AppField name="username">
					{(field) => (
						<field.TextInput
							label="Your nickname"
							description="Your username helps you find friends, and accompanies your contributions to the library."
							placeholder="e.g. Learnie McLearnerson, Helpar1992"
							inputMode="text"
						/>
					)}
				</form.AppField>
				<form.AppField name="languages_known">
					{() => <LanguagesKnownField />}
				</form.AppField>
				<div className="flex flex-col gap-4 @xl:flex-row @xl:justify-between">
					<form.AppForm>
						<form.SubmitButton size="lg" className="w-full @xl:w-auto">
							Save your profile
						</form.SubmitButton>
					</form.AppForm>
				</div>
			</form>
		</div>
	)
}
