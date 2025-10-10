import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { uuid, ProfileInsert } from '@/types/main'
import { LanguagesKnownSchema } from '@/lib/schemas'
import { useAuth } from '@/lib/hooks'
import { useProfile } from '@/hooks/use-profile'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { Button } from '@/components/ui/button'
import supabase from '@/lib/supabase-client'
import UsernameField from '@/components/fields/username-field'
import { LanguagesKnownField } from '@/components/fields/languages-known-field'

type GettingStartedProps = {
	referrer?: uuid
}

export const Route = createFileRoute('/_user/getting-started')({
	validateSearch: (search?: Record<string, unknown>): GettingStartedProps => {
		return search ?
				{
					referrer: (search.referrer as string) || '',
				}
			:	{}
	},
	component: GettingStartedPage,
})

function GettingStartedPage() {
	const { referrer }: GettingStartedProps = Route.useSearch()
	const { userId, userRole } = useAuth()
	const { data: profile } = useProfile()

	const nextPage =
		referrer ? `/friends/search/${referrer}`
		: userRole === 'learner' ? '/learn/add-deck'
		: '/friends'

	return profile !== null ?
			<Navigate to={nextPage} />
		:	<main className="w-app px-[5cqw] py-10">
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
	const queryClient = useQueryClient()

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
		mutationFn: async (values: ProfileInsert) => {
			const { data } = await supabase
				.from('user_profile')
				.upsert(values)
				.match({ uid: userId })
				.throwOnError()
				.select()
			return data
		},
		onSuccess: async (data) => {
			console.log(`Success! deck, profile`, data)
			toast.success('Success!')
			await queryClient.invalidateQueries({ queryKey: ['user'] })
		},
		onError: (error) => {
			console.log(`Error:`, error)
			toast.error(`there was some error: ${error.message}`)
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
