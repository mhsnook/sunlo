import { CSSProperties, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
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
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'

import { useDeckMeta } from '@/hooks/use-deck'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { ArchiveDeckButton } from './-archive-deck-button'
import {
	FancySelectField,
	FancySelectOption,
} from '@/components/fields/fancy-select-field'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { decksCollection } from '@/lib/collections'
import { Tables } from '@/types/supabase'
import { useProfile } from '@/hooks/use-profile'
import languages from '@/lib/languages'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/_user/learn/$lang/deck-settings')({
	component: DeckSettingsPage,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function DeckSettingsPage() {
	const isAuth = useIsAuthenticated()
	const { lang } = Route.useParams()
	const { data: meta, isReady } = useDeckMeta(lang)

	// Require auth for deck settings
	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to manage deck settings.">
				<div />
			</RequireAuth>
		)
	}

	// return early conditions: not ready yet, or deck not found error
	if (!meta)
		if (!isReady) return null
		else throw new Error(`No deck found for language "${lang}"`)

	return (
		<Card style={style}>
			<CardHeader>
				<CardTitle>Deck Settings</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{!meta.archived ?
					<>
						<GoalForm lang={meta.lang} learning_goal={meta.learning_goal} />
						<DailyGoalForm
							lang={meta.lang}
							daily_review_goal={meta.daily_review_goal}
						/>
						<PreferredTranslationLanguageForm
							lang={meta.lang}
							preferred_translation_lang={meta.preferred_translation_lang}
						/>
					</>
				:	null}
				<CardHeader className="rounded shadow">
					<CardTitle className="flex w-full flex-row items-center justify-between gap-2">
						<span>
							{meta.archived ? 'Reactivate deck' : 'Archive your deck'}
						</span>
						<ArchiveDeckButton lang={meta.lang} archived={meta.archived} />
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
	const userId = useUserId()
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
		Tables<'user_deck'>,
		PostgrestError,
		DailyGoalFormInputs
	>({
		mutationKey: ['user', lang, 'deck', 'settings', 'daily-goal'],
		mutationFn: async (values: DailyGoalFormInputs) => {
			console.log(`start updateDailyGoalMutation`, { values })
			const { data } = await supabase
				.from('user_deck')
				.update({ daily_review_goal: values.daily_review_goal })
				.eq('lang', lang)
				.eq('uid', userId)
				.throwOnError()
				.select()
			if (!data)
				throw new Error('Failed to update daily goal: did not find deck')
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(data)
			reset(data)
			toast.success('Your deck settings have been updated.')
		},
		onError: (error) => {
			toast.error(
				'There was some error; please refresh the page to see if settings updated correctly.'
			)
			console.log(`Daily Goal Form deck settings update error`, { error })
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
	const userId = useUserId()
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
		Tables<'user_deck'>,
		PostgrestError,
		DeckGoalFormInputs
	>({
		mutationKey: ['user', lang, 'deck', 'settings', 'goal'],
		mutationFn: async (values: DeckGoalFormInputs) => {
			console.log(`start updateDeckGoalMutation`, { values })
			const { data } = await supabase
				.from('user_deck')
				.update({ learning_goal: values.learning_goal })
				.eq('lang', lang)
				.eq('uid', userId)
				.throwOnError()
				.select()
			if (!data)
				throw new Error('Failed to update deck goal: did not find deck')
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(data)
			reset(data)
			toast.success('Your deck settings have been updated.')
		},
		onError: (error) => {
			toast.error(
				'There was some error; please refresh the page to see if settings updated correctly.'
			)
			console.log(`Language Goal Form deck settings update error`, { error })
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

type PreferredTranslationLangFormInputs = {
	preferred_translation_lang: string | null
	lang: string
}

function PreferredTranslationLanguageForm({
	preferred_translation_lang,
	lang,
}: PreferredTranslationLangFormInputs) {
	const userId = useUserId()
	const { data: profile } = useProfile()
	const [selectedLang, setSelectedLang] = useState<string | null>(
		preferred_translation_lang
	)

	const profileDefaultLang = profile?.languages_known[0]?.lang ?? null

	const updatePreferredLangMutation = useMutation<
		Tables<'user_deck'>,
		PostgrestError,
		{ preferred_translation_lang: string | null }
	>({
		mutationKey: ['user', lang, 'deck', 'settings', 'preferred-translation'],
		mutationFn: async (values) => {
			console.log(`start updatePreferredLangMutation`, { values })
			const { data } = await supabase
				.from('user_deck')
				.update({
					preferred_translation_lang: values.preferred_translation_lang,
				})
				.eq('lang', lang)
				.eq('uid', userId)
				.throwOnError()
				.select()
			if (!data)
				throw new Error(
					'Failed to update preferred translation language: did not find deck'
				)
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(data)
			setSelectedLang(data.preferred_translation_lang)
			toast.success('Your preferred translation language has been updated.')
		},
		onError: (error) => {
			toast.error(
				'There was some error; please refresh the page to see if settings updated correctly.'
			)
			console.log(`Preferred translation lang update error`, { error })
		},
	})

	const isDirty = selectedLang !== preferred_translation_lang

	const handleSave = () => {
		updatePreferredLangMutation.mutate({
			preferred_translation_lang: selectedLang,
		})
	}

	const handleReset = () => {
		setSelectedLang(preferred_translation_lang)
	}

	const handleClearOverride = () => {
		updatePreferredLangMutation.mutate({
			preferred_translation_lang: null,
		})
	}

	const handleSetLang = (val: string) => setSelectedLang(val || null)

	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle>
					<span className="h4">Preferred translation language</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Choose which language translations are shown first when studying this
					deck. If not set, your profile default will be used.
				</p>
				{profileDefaultLang && (
					<p className="text-muted-foreground text-sm">
						Your profile default:{' '}
						<strong>
							{languages[profileDefaultLang] ?? profileDefaultLang}
						</strong>
					</p>
				)}
				<div className="space-y-2">
					<Label>Translation language for this deck</Label>
					<SelectOneOfYourLanguages
						value={selectedLang ?? ''}
						setValue={handleSetLang}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button onClick={handleSave} disabled={!isDirty}>
						Save preference
					</Button>
					<Button variant="secondary" onClick={handleReset} disabled={!isDirty}>
						Reset
					</Button>
					{preferred_translation_lang && (
						<Button variant="outline" onClick={handleClearOverride}>
							Use profile default
						</Button>
					)}
				</div>
			</CardContent>
		</div>
	)
}
