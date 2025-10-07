import { DeckRow } from '@/types/main'

import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import toast from 'react-hot-toast'

import {
	Briefcase,
	Cat,
	GraduationCap,
	IceCreamBowl,
	Rocket,
	Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useDeckMeta } from '@/hooks/use-deck'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { ArchiveDeckButton } from './-archive-deck-button'
import {
	FancySelectField,
	FancySelectOption,
} from '@/components/fields/fancy-select-field'

export const Route = createFileRoute('/_user/learn/$lang/deck-settings')({
	component: DeckSettingsPage,
})

function DeckSettingsPage() {
	const { lang } = Route.useParams()
	const { data: meta } = useDeckMeta(lang)
	// the query for deck meta suspends higher up in the tree
	if (!meta) throw new Error(`No deck found for language "${lang}"`)
	return (
		<Card>
			<CardHeader>
				<CardTitle>Deck Settings</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{!meta.archived ?
					<>
						<GoalForm lang={meta.lang!} learning_goal={meta.learning_goal!} />
						<DailyGoalForm
							lang={meta.lang!}
							daily_review_goal={meta.daily_review_goal!}
						/>
					</>
				:	null}
				<CardHeader className="rounded shadow">
					<CardTitle className="flex w-full flex-row items-center justify-between gap-2">
						<span>
							{meta.archived ? 'Reactivate deck' : 'Archive your deck'}
						</span>
						<ArchiveDeckButton lang={meta.lang!} archived={meta.archived!} />
					</CardTitle>
				</CardHeader>
			</CardContent>
		</Card>
	)
}

const DailyGoalSchema = z.object({
	daily_review_goal: z
		.number()
		.min(1, { message: 'Invalid goal value; must be 10, 15, or 20' }),
	lang: z.string().min(3, { message: 'ou must select a deck to modify' }),
})

type DailyGoalFormInputs = z.infer<typeof DailyGoalSchema>

const dailyReviewGoalOptions: FancySelectOption[] = [
	{
		value: 10,
		label: '10 – Relaxed',
		description:
			'10 new cards daily, for casual learners; expect about 45 reviews daily',
		Icon: Cat,
	},
	{
		value: 15,
		label: '15 – Standard',
		description:
			'15 new cards daily, the default for most learners; expect 80 reviews daily',
		Icon: IceCreamBowl,
	},
	{
		value: 20,
		label: '20 – Serious',
		description:
			'20 new cards daily, for serious learners! expect about 125 reviews daily',
		Icon: Rocket,
	},
]

function DailyGoalForm({ daily_review_goal, lang }: DailyGoalFormInputs) {
	const queryClient = useQueryClient()
	const { userId } = useAuth()
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<DailyGoalFormInputs>({
		resolver: zodResolver(DailyGoalSchema),
		defaultValues: { daily_review_goal, lang },
	})

	const updateDailyGoalMutation = useMutation<
		DeckRow,
		PostgrestError,
		DailyGoalFormInputs
	>({
		mutationKey: ['user', lang, 'deck', 'settings', 'daily-goal'],
		mutationFn: async (values: DailyGoalFormInputs) => {
			const { data } = await supabase
				.from('user_deck')
				.update({ daily_review_goal: values.daily_review_goal })
				.eq('lang', lang)
				.eq('uid', userId!)
				.throwOnError()
				.select()
			if (!data)
				throw new Error('Failed to update daily goal: did not find deck')
			return data[0]
		},
		onSuccess: (data) => {
			toast.success('Your deck settings have been updated.')
			void queryClient.invalidateQueries({
				queryKey: ['user', lang, 'deck'],
			})
			reset(data)
		},
		onError: () => {
			toast.error(
				'There was some issue and your deck settings were not updated.'
			)
		},
	})
	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle>
					<span className="h4">Your daily goal</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit((data) =>
						updateDailyGoalMutation.mutate(data)
					)}
					className="space-y-4"
				>
					<FancySelectField<DailyGoalFormInputs>
						name="daily_review_goal"
						control={control}
						error={errors.daily_review_goal}
						options={dailyReviewGoalOptions}
					/>
					<div className="space-x-2">
						<Button type="submit" disabled={!isDirty}>
							Update your daily goal
						</Button>
						<Button
							variant="secondary"
							type="button"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => reset()}
							disabled={!isDirty}
						>
							Reset
						</Button>
					</div>
				</form>
			</CardContent>
		</div>
	)
}

const DeckGoalSchema = z.object({
	learning_goal: z.enum(['visiting', 'family', 'moving']),
	lang: z.string().min(3, { message: 'You must select a deck to modify' }),
})

type DeckGoalFormInputs = z.infer<typeof DeckGoalSchema>

const learningGoalOptions: FancySelectOption[] = [
	{
		value: 'moving',
		label: 'Moving or learning for friends',
		description: "I'll be getting help from friends or colleagues",
		Icon: GraduationCap,
	},
	{
		value: 'family',
		label: 'Family connection',
		description:
			'I want to connect with relatives by learning a family or ancestral language',
		Icon: Users,
	},
	{
		value: 'visiting',
		label: 'Just visiting',
		description: "I'm learning the basics for an upcoming trip",
		Icon: Briefcase,
	},
]

function GoalForm({ learning_goal, lang }: DeckGoalFormInputs) {
	const queryClient = useQueryClient()
	const { userId } = useAuth()
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<DeckGoalFormInputs>({
		resolver: zodResolver(DeckGoalSchema),
		defaultValues: { learning_goal, lang },
	})

	const updateDeckGoalMutation = useMutation<
		DeckRow,
		PostgrestError,
		DeckGoalFormInputs
	>({
		mutationKey: ['user', lang, 'deck', 'settings', 'goal'],
		mutationFn: async (values: DeckGoalFormInputs) => {
			const { data } = await supabase
				.from('user_deck')
				.update({ learning_goal: values.learning_goal })
				.eq('lang', lang)
				.eq('uid', userId!)
				.throwOnError()
				.select()
			if (!data)
				throw new Error('Failed to update deck goal: did not find deck')
			return data[0]
		},
		onSuccess: (data) => {
			toast.success('Your deck settings have been updated.')
			void queryClient.invalidateQueries({
				queryKey: ['user', lang, 'deck'],
			})
			reset(data)
		},
		onError: () => {
			toast.error(
				'There was some issue and your deck settings were not updated.'
			)
		},
	})

	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle>
					<span className="h4">Your learning goals</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit((data) => updateDeckGoalMutation.mutate(data))}
					className="space-y-4"
				>
					<FancySelectField<DeckGoalFormInputs>
						name="learning_goal"
						control={control}
						error={errors.learning_goal}
						options={learningGoalOptions}
					/>
					<div className="space-x-2">
						<Button type="submit" disabled={!isDirty}>
							Update your goal
						</Button>
						<Button
							variant="secondary"
							type="button"
							onClick={useCallback(() => reset(), [reset])}
							disabled={!isDirty}
						>
							Reset
						</Button>
					</div>
				</form>
			</CardContent>
		</div>
	)
}
