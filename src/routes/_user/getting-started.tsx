import type { CSSProperties } from 'react'
import { createFileRoute, Navigate, redirect } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema } from '@/features/deck/schemas'
import languages from '@/lib/languages'
import { Button } from '@/components/ui/button'
import UsernameField from '@/components/fields/username-field'
import { LanguagesKnownField } from '@/components/fields/languages-known-field'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'

const PLAYLIST_INTENT_KEY = 'sunlo:playlist-intent'

type GettingStartedProps = {
	referrer?: uuid
}

export const Route = createFileRoute('/_user/getting-started')({
	validateSearch: (search?: Record<string, unknown>): GettingStartedProps => {
		return search ?
				{
					referrer: (search.referrer as string) || undefined,
				}
			:	{}
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

	// After profile creation, redirect based on intent:
	// 1. Playlist intent → back to the playlist page (deck was auto-created)
	// 2. Friend referrer → friend search
	// 3. Default → welcome page
	const playlistIntent = (() => {
		try {
			const raw = localStorage.getItem(PLAYLIST_INTENT_KEY)
			return raw ?
					(JSON.parse(raw) as { lang: string; playlistId: string })
				:	null
		} catch {
			return null
		}
	})()

	const nextPage =
		playlistIntent ?
			`/learn/${playlistIntent.lang}/playlists/${playlistIntent.playlistId}`
		: referrer ? `/friends/search/${referrer}`
		: '/welcome'

	return profile ?
			<Navigate to={nextPage} />
		:	<main
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
	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			languages_known: [{ lang: 'eng', level: 'fluent' }],
		},
	})

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
		onSuccess: async (data) => {
			if (!data)
				throw new Error(
					`Somehow the server didn't return any data for the new profile...`
				)
			console.log(`Success! Profile:`, data)

			// Auto-create deck from playlist intent before writing profile,
			// because the profile write triggers navigation via <Navigate>
			const intentStr = localStorage.getItem(PLAYLIST_INTENT_KEY)
			if (intentStr) {
				try {
					const intent = JSON.parse(intentStr) as {
						lang: string
						playlistId: string
					}
					const { data: deck, error } = await supabase
						.from('user_deck')
						.insert({ lang: intent.lang })
						.select()
					if (!error && deck?.[0]) {
						decksCollection.utils.writeInsert(
							DeckMetaSchema.parse({
								...deck[0],
								language: languages[deck[0].lang],
								theme: 0,
							})
						)
					}
				} catch (e) {
					console.log('Failed to auto-create deck from playlist intent', e)
				}
				localStorage.removeItem(PLAYLIST_INTENT_KEY)
			}

			myProfileCollection.utils.writeInsert(MyProfileSchema.parse(data[0]))
			toastSuccess('Success!')
		},
		onError: (error) => {
			console.log(`Error:`, error)
			toastError(`there was some error: ${error.message}`)
		},
	})

	return (
		<div className="mx-auto space-y-8">
			<form
				noValidate
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit((data) => mainForm.mutate(data))}
				className="space-y-6"
			>
				<UsernameField register={register} error={errors.username} />
				<LanguagesKnownField control={control} error={errors.languages_known} />
				<div className="flex flex-col gap-4 @xl:flex-row @xl:justify-between">
					<Button type="submit" size="lg" className="w-full @xl:w-auto">
						Save your profile
					</Button>
				</div>
			</form>
		</div>
	)
}
