import type { CSSProperties } from 'react'
import { createFileRoute, Navigate, redirect } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { TablesInsert } from '@/types/supabase'
import type { uuid } from '@/types/main'
import {
	LanguagesKnownSchema,
	MyProfileSchema,
} from '@/features/profile/schemas'
import { useUserId } from '@/lib/use-auth'
import { useProfile } from '@/features/profile/hooks'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/features/profile/collections'
import { LanguagesKnownField } from '@/components/fields/languages-known-field'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
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
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuth) {
			console.log(
				'Issuing redirect to /login from /getting-started page bc not logged in'
			)
			throw redirect({ to: '/login' })
		}
		return {
			titleBar: {
				title: 'Getting Started',
				subtitle: 'Set your username and dive in!',
			},
		}
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function GettingStartedPage() {
	const { referrer }: GettingStartedProps = Route.useSearch()
	const userId = useUserId()
	const { data: profile } = useProfile()

	// After profile creation, go to welcome page (or friend's chat if invited)
	const nextPage = referrer ? `/friends/chats/${referrer}` : '/welcome'

	return profile ? (
		<Navigate to={nextPage} />
	) : (
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
			<ProfileCreationForm userId={userId!} />
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

function ProfileCreationForm({ userId }: { userId: string }) {
	const mainForm = useMutation({
		mutationKey: ['user', userId],
		mutationFn: async (values: TablesInsert<'user_profile'>) => {
			const { data } = await supabase
				.from('user_profile')
				.upsert(values)
				.match({ uid: userId })
				.throwOnError()
				.select()
			return data
		},
		onSuccess: (data) => {
			if (!data)
				throw new Error(
					`Somehow the server didn't return any data for the new profile...`
				)
			console.log(`Success! Profile:`, data)
			myProfileCollection.utils.writeInsert(MyProfileSchema.parse(data[0]))
			toastSuccess('Success!')
		},
		onError: (error) => {
			console.log(`Error:`, error)
			toastError(`there was some error: ${error.message}`)
		},
	})

	const form = useAppForm({
		defaultValues: {
			username: '',
			languages_known: [{ lang: 'eng', level: 'fluent' }],
		} as FormData,
		validators: { onChange: formSchema },
		onSubmit: async ({ value }) => {
			await mainForm.mutateAsync(value)
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
