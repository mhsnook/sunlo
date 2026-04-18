import { type CSSProperties, Fragment, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import {
	Briefcase,
	Cat,
	Columns2,
	GraduationCap,
	Grid2x2,
	IceCreamBowl,
	Rocket,
	Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'

import { useDeckMeta } from '@/features/deck/hooks'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { ArchiveDeckButton } from './-archive-deck-button'
import {
	FancySelectField,
	FancySelectOption,
} from '@/components/fields/fancy-select-field'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaRawSchema } from '@/features/deck/schemas'
import { Tables } from '@/types/supabase'
import { useProfile } from '@/features/profile/hooks'
import { type ReviewAnswerModeType } from '@/features/profile/schemas'
import { cn } from '@/lib/utils'
import languages from '@/lib/languages'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { InfoDialog } from '@/components/info-dialog'

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
		<Card style={style} data-testid="deck-settings-page">
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
						<ReviewAnswerModeForm
							lang={meta.lang}
							review_answer_mode={meta.review_answer_mode}
						/>
					</>
				:	null}
				<CardHeader className="rounded shadow">
					<CardTitle className="flex w-full flex-row items-center justify-between gap-2">
						<span className="h4">
							{meta.archived ? 'Reactivate deck' : 'Archive your deck'}
						</span>
						<span className="flex items-center gap-1">
							<InfoDialog title="Archive Deck">
								<p>
									If you want to pause learning this language, you can archive
									the deck. Your progress is saved and you can reactivate
									anytime.
								</p>
							</InfoDialog>
							<ArchiveDeckButton lang={meta.lang} archived={meta.archived} />
						</span>
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
				.eq('uid', userId!)
				.throwOnError()
				.select()
			if (!data)
				throw new Error('Failed to update daily goal: did not find deck')
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
			reset(data)
			toastSuccess('Your deck settings have been updated.')
		},
		onError: (error) => {
			toastError(
				'There was some error; please refresh the page to see if settings updated correctly.'
			)
			console.log(`Daily Goal Form deck settings update error`, { error })
		},
	})
	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center justify-between">
					<span className="h4">Your daily goal</span>
					<InfoDialog title="Daily Goal">
						<p>
							This controls how many <em>new</em> cards you see each day. A
							higher number means faster progress but more daily reviews. Most
							learners do well with 10-15 new cards per day.
						</p>
						<div className="mx-2 space-y-3">
							<div className="bg-0-lo-primary flex items-start gap-3 rounded-2xl px-4 py-3">
								<Cat className="text-primary mt-0.5 size-7 shrink-0" />
								<div>
									<p className="font-semibold">Relaxed — 10 new cards</p>
									<p className="text-foreground/70">
										~45 total reviews per day
									</p>
								</div>
							</div>
							<div className="bg-0-lo-primary flex items-start gap-3 rounded-2xl px-4 py-3">
								<IceCreamBowl className="text-primary mt-0.5 size-7 shrink-0" />
								<div>
									<p className="font-semibold">Standard — 15 new cards</p>
									<p className="text-foreground/70">
										~80 total reviews per day
									</p>
								</div>
							</div>
							<div className="bg-0-lo-primary flex items-start gap-3 rounded-2xl px-4 py-3">
								<Rocket className="text-primary mt-0.5 size-7 shrink-0" />
								<div>
									<p className="font-semibold">Serious — 20 new cards</p>
									<p className="text-foreground/70">
										~125 total reviews per day
									</p>
								</div>
							</div>
						</div>
					</InfoDialog>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					data-testid="review-goal-options"
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
						<Button
							type="submit"
							disabled={!isDirty}
							data-testid="update-daily-goal-button"
						>
							Update your daily goal
						</Button>
						<Button
							variant="neutral"
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
				.eq('uid', userId!)
				.throwOnError()
				.select()
			if (!data)
				throw new Error('Failed to update deck goal: did not find deck')
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
			reset(data)
			toastSuccess('Your deck settings have been updated.')
		},
		onError: (error) => {
			toastError(
				'There was some error; please refresh the page to see if settings updated correctly.'
			)
			console.log(`Language Goal Form deck settings update error`, { error })
		},
	})

	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center justify-between">
					<span className="h4">Your learning goals</span>
					<InfoDialog title="Learning Goal">
						<p>
							This helps us understand your motivation and may influence content
							recommendations in the future. Choose what best describes why
							you're learning this language.
						</p>
					</InfoDialog>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					data-testid="learning-goal-options"
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
						<Button
							type="submit"
							disabled={!isDirty}
							data-testid="update-goal-button"
						>
							Update your goal
						</Button>
						<Button
							variant="neutral"
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
				.eq('uid', userId!)
				.throwOnError()
				.select()
			if (!data)
				throw new Error(
					'Failed to update preferred translation language: did not find deck'
				)
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
			setSelectedLang(data.preferred_translation_lang)
			toastSuccess('Your preferred translation language has been updated.')
		},
		onError: (error) => {
			toastError(
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

	const handleClearOverride = () => {
		updatePreferredLangMutation.mutate({
			preferred_translation_lang: null,
		})
	}

	const handleSetLang = (val: string) => setSelectedLang(val || null)

	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center justify-between">
					<span className="h4">Preferred translation language</span>
					<InfoDialog title="Translation Language">
						<p>
							By default, translations show in your profile's primary language.
							If you want this deck to show translations in a different language
							(e.g., Spanish instead of English), you can override it here.
						</p>
					</InfoDialog>
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
						disabled={[lang]}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={handleSave}
						disabled={!isDirty || updatePreferredLangMutation.isPending}
					>
						Save preference
					</Button>
					<Button
						variant="neutral"
						onClick={handleClearOverride}
						disabled={updatePreferredLangMutation.isPending}
					>
						Clear
					</Button>
				</div>
			</CardContent>
		</div>
	)
}

const reviewAnswerModeOptions: Array<FancySelectOption> = [
	{
		value: '4-buttons',
		label: 'Show 4 answer choices',
		description: 'Again, Hard, Good, Easy',
		Icon: Grid2x2,
	},
	{
		value: '2-buttons',
		label: 'Show 2 answer choices',
		description: 'Forgot, Correct!',
		Icon: Columns2,
	},
]

function ReviewAnswerModeRadio({
	value,
	onChange,
}: {
	value: string | null
	onChange: (val: string) => void
}) {
	return (
		<RadioGroup
			onValueChange={onChange}
			value={value ?? ''}
			className="gap-0"
			data-testid="review-answer-mode-radio"
		>
			{reviewAnswerModeOptions.map((option) => (
				<Fragment key={option.value}>
					<RadioGroupItem
						value={String(option.value)}
						id={`deck-review-mode-${option.value}`}
						className="sr-only"
					/>
					<Label
						htmlFor={`deck-review-mode-${option.value}`}
						data-testid={`review-answer-mode-${option.value}`}
						className={cn(
							'flex w-full cursor-pointer items-center rounded-2xl border border-transparent p-4 transition-colors',
							value !== null && String(value) === String(option.value) ?
								'bg-1-mlo-primary border-2-mlo-primary'
							:	'hover:bg-base-mlo-primary hover:border-input'
						)}
					>
						{option.Icon && (
							<span
								className={`transition-color mr-3 flex aspect-square place-items-center rounded-xl p-2 ${
									value !== null && String(value) === String(option.value) ?
										'bg-primary-foresoft text-primary-foreground'
									:	''
								}`}
							>
								<option.Icon className="size-5" />
							</span>
						)}
						<div className="space-y-1">
							<div>{option.label}</div>
							<div className="text-sm font-medium opacity-60">
								{option.description}
							</div>
						</div>
					</Label>
				</Fragment>
			))}
		</RadioGroup>
	)
}

function ReviewAnswerModeForm({
	lang,
	review_answer_mode,
}: {
	lang: string
	review_answer_mode: ReviewAnswerModeType | null
}) {
	const userId = useUserId()
	const { data: profile } = useProfile()
	const profileMode = profile?.review_answer_mode ?? '2-buttons'
	const [selected, setSelected] = useState<string | null>(review_answer_mode)

	const isDirty = selected !== review_answer_mode
	const hasOverride = review_answer_mode !== null

	const updateAnswerModeMutation = useMutation<
		Tables<'user_deck'>,
		PostgrestError,
		{ review_answer_mode: string | null }
	>({
		mutationKey: ['user', lang, 'deck', 'settings', 'review-answer-mode'],
		mutationFn: async (values) => {
			const { data } = await supabase
				.from('user_deck')
				.update({ review_answer_mode: values.review_answer_mode })
				.eq('lang', lang)
				.eq('uid', userId!)
				.throwOnError()
				.select()
			if (!data)
				throw new Error(
					'Failed to update review answer mode: did not find deck'
				)
			return data[0]
		},
		onSuccess: (data) => {
			decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
			setSelected(data.review_answer_mode as ReviewAnswerModeType | null)
			toastSuccess(
				data.review_answer_mode ?
					'Review answer mode updated for this deck.'
				:	'Deck will now use your profile setting.'
			)
		},
		onError: (error) => {
			toastError(
				'There was some error; please refresh the page to see if settings updated correctly.'
			)
			console.log(`Review answer mode update error`, { error })
		},
	})

	const handleSave = () => {
		updateAnswerModeMutation.mutate({ review_answer_mode: selected })
	}

	const handleClear = () => {
		if (hasOverride) {
			updateAnswerModeMutation.mutate({ review_answer_mode: null })
		} else {
			setSelected(null)
		}
	}

	return (
		<div className="rounded shadow">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center justify-between">
					<span className="h4">Review answer choices</span>
					<InfoDialog title="Review Answer Choices">
						<p>
							In Spaced-Repetition (SRS) systems the default is usually to show
							4 options: &ldquo;Again&rdquo; when you couldn&rsquo;t remember
							the card, and three options for &ldquo;Hard, Good, Easy&rdquo;
							when you could. The SRS algorithm benefits slightly from the
							increased precision, but not very much. So some users prefer just
							2 buttons, &ldquo;No&rdquo; and &ldquo;Yes&rdquo;, which are
							equivalent to &ldquo;Again&rdquo; and &ldquo;Good&rdquo;.
						</p>
					</InfoDialog>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Override your profile default for this deck. If not set, your profile
					setting will be used.
				</p>
				<p className="text-muted-foreground text-sm">
					{review_answer_mode ?
						'Overriding the profile default: '
					:	'Currently using profile default: '}
					<strong>
						{profileMode === '2-buttons' ?
							'2 buttons (Forgot, Correct!)'
						:	'4 buttons (Again, Hard, Good, Easy)'}
					</strong>
				</p>
				<ReviewAnswerModeRadio value={selected} onChange={setSelected} />
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={handleSave}
						disabled={!isDirty || updateAnswerModeMutation.isPending}
						data-testid="update-review-answer-mode-button"
					>
						Update answer mode
					</Button>
					<Button
						variant="neutral"
						disabled={
							(!hasOverride && selected === null) ||
							updateAnswerModeMutation.isPending
						}
						onClick={handleClear}
						data-testid="clear-review-answer-mode-button"
					>
						Clear
					</Button>
				</div>
			</CardContent>
		</div>
	)
}
