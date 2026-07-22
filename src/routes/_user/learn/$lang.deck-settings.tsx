import { type CSSProperties } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
	type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChoiceTile } from '@/components/ui/choice-tile'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'

import { useDeckMeta } from '@/features/deck/hooks'
import { ArchiveDeckButton } from './-archive-deck-button'
import { LanguagePicker } from '@/components/fields/language-picker'
import { decksCollection } from '@/features/deck/collections'
import { type DeckMetaType } from '@/features/deck/schemas'
import { useProfile } from '@/features/profile/hooks'
import { type ReviewAnswerModeType } from '@/features/profile/schemas'
import { cn } from '@/lib/utils'
import languages from '@/lib/languages'
import { Label } from '@/components/ui/label'
import { InfoDialog } from '@/components/info-dialog'

type LearningGoalType = DeckMetaType['learning_goal']

export const Route = createFileRoute('/_user/learn/$lang/deck-settings')({
	component: DeckSettingsPage,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function DeckSettingsPage() {
	const isAuth = useIsAuthenticated()
	const { lang } = Route.useParams()
	const { data: meta, isReady } = useDeckMeta(lang)

	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to manage deck settings.">
				<div />
			</RequireAuth>
		)
	}

	if (!meta)
		if (!isReady) return null
		else throw new Error(`No deck found for language "${lang}"`)

	return (
		<Card style={style} data-testid="deck-settings-page">
			<CardHeader>
				<CardTitle>Deck Settings</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{!meta.archived ? (
					<>
						<LearningGoalSection
							lang={meta.lang}
							learning_goal={meta.learning_goal}
						/>
						<DailyGoalSection
							lang={meta.lang}
							daily_review_goal={meta.daily_review_goal}
						/>
						<PreferredTranslationLanguageSection
							lang={meta.lang}
							preferred_translation_lang={meta.preferred_translation_lang}
						/>
						<ReviewAnswerModeSection
							lang={meta.lang}
							review_answer_mode={meta.review_answer_mode}
						/>
					</>
				) : null}
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

type FancyChoice<V extends string | number> = {
	value: V
	label: string
	description: string
	Icon: LucideIcon
}

function FancyChoiceButton<V extends string | number>({
	option,
	selected,
	disabled,
	onClick,
}: {
	option: FancyChoice<V>
	selected: boolean
	disabled: boolean
	onClick: () => void
}) {
	return (
		<ChoiceTile
			selected={selected}
			disabled={disabled}
			onClick={onClick}
			data-key={String(option.value)}
			className="flex w-full items-center p-4 text-start"
		>
			<span
				className={cn(
					'transition-color mr-3 flex aspect-square place-items-center rounded-xl p-2',
					selected ? 'bg-primary-foresoft text-primary-foreground' : ''
				)}
			>
				<option.Icon className="size-5" />
			</span>
			<div className="space-y-1">
				<div>{option.label}</div>
				<div className="text-sm font-medium opacity-60">
					{option.description}
				</div>
			</div>
		</ChoiceTile>
	)
}

const dailyReviewGoalOptions: Array<FancyChoice<number>> = [
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

function DailyGoalSection({
	lang,
	daily_review_goal,
}: {
	lang: string
	daily_review_goal: number
}) {
	const updateDailyGoal = (value: number) => {
		if (value === daily_review_goal) return
		const tx = decksCollection.update(lang, (draft) => {
			draft.daily_review_goal = value
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('Your daily review goal has been updated.'),
			(error) => {
				toastError(
					'There was some error; please refresh the page to see if settings updated correctly.'
				)
				console.error('Daily Goal update error:', error)
			}
		)
	}

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
							<div className="bg-lc-0 bg-chroma-lo bg-hue-primary flex items-start gap-3 rounded-2xl px-4 py-3">
								<Cat className="text-primary mt-0.5 size-7 shrink-0" />
								<div>
									<p className="font-semibold">Relaxed — 10 new cards</p>
									<p className="text-foreground/70">
										~45 total reviews per day
									</p>
								</div>
							</div>
							<div className="bg-lc-0 bg-chroma-lo bg-hue-primary flex items-start gap-3 rounded-2xl px-4 py-3">
								<IceCreamBowl className="text-primary mt-0.5 size-7 shrink-0" />
								<div>
									<p className="font-semibold">Standard — 15 new cards</p>
									<p className="text-foreground/70">
										~80 total reviews per day
									</p>
								</div>
							</div>
							<div className="bg-lc-0 bg-chroma-lo bg-hue-primary flex items-start gap-3 rounded-2xl px-4 py-3">
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
				<div data-testid="review-goal-options" className="space-y-2">
					{dailyReviewGoalOptions.map((option) => (
						<FancyChoiceButton
							key={option.value}
							option={option}
							selected={daily_review_goal === option.value}
							disabled={daily_review_goal === option.value}
							onClick={() => updateDailyGoal(option.value)}
						/>
					))}
				</div>
			</CardContent>
		</div>
	)
}

const learningGoalOptions: Array<FancyChoice<LearningGoalType>> = [
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

function LearningGoalSection({
	lang,
	learning_goal,
}: {
	lang: string
	learning_goal: LearningGoalType
}) {
	const updateLearningGoal = (value: LearningGoalType) => {
		if (value === learning_goal) return
		const tx = decksCollection.update(lang, (draft) => {
			draft.learning_goal = value
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('Your learning goal has been updated.'),
			(error) => {
				toastError(
					'There was some error; please refresh the page to see if settings updated correctly.'
				)
				console.error('Language Goal update error:', error)
			}
		)
	}

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
				<div data-testid="learning-goal-options" className="space-y-2">
					{learningGoalOptions.map((option) => (
						<FancyChoiceButton
							key={option.value}
							option={option}
							selected={learning_goal === option.value}
							disabled={learning_goal === option.value}
							onClick={() => updateLearningGoal(option.value)}
						/>
					))}
				</div>
			</CardContent>
		</div>
	)
}

function PreferredTranslationLanguageSection({
	lang,
	preferred_translation_lang,
}: {
	lang: string
	preferred_translation_lang: string | null
}) {
	const { data: profile } = useProfile()
	const profileDefaultLang = profile?.languages_known[0]?.lang ?? null

	const updatePreferred = (next: string | null) => {
		if (next === preferred_translation_lang) return
		const tx = decksCollection.update(lang, (draft) => {
			draft.preferred_translation_lang = next
		})
		tx.isPersisted.promise.then(
			() =>
				toastSuccess(
					next
						? 'Your preferred translation language has been updated.'
						: 'Deck will now use your profile default translation language.'
				),
			(error) => {
				toastError(
					'There was some error; please refresh the page to see if settings updated correctly.'
				)
				console.error('Preferred translation lang update error:', error)
			}
		)
	}

	const handleSetLang = (val: string) => {
		updatePreferred(val || null)
	}

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
					<LanguagePicker
						value={preferred_translation_lang ?? ''}
						setValue={handleSetLang}
						disabled={[lang]}
					/>
				</div>
				<div>
					<Button
						variant="neutral"
						size="sm"
						onClick={() => updatePreferred(null)}
						disabled={preferred_translation_lang === null}
						data-testid="clear-preferred-translation-button"
					>
						Use profile default
					</Button>
				</div>
			</CardContent>
		</div>
	)
}

const reviewAnswerModeOptions: Array<FancyChoice<ReviewAnswerModeType>> = [
	{
		value: '4-buttons',
		label: 'Show 4 answer choices',
		description: 'Again, Hard, Good, Easy',
		Icon: Grid2x2,
	},
	{
		value: '2-buttons',
		label: 'Show 2 answer choices',
		description: 'Try Again, Correct!',
		Icon: Columns2,
	},
]

function ReviewAnswerModeSection({
	lang,
	review_answer_mode,
}: {
	lang: string
	review_answer_mode: ReviewAnswerModeType | null
}) {
	const { data: profile } = useProfile()
	const profileMode = profile?.review_answer_mode ?? '2-buttons'
	const hasOverride = review_answer_mode !== null

	const updateAnswerMode = (next: ReviewAnswerModeType | null) => {
		if (next === review_answer_mode) return
		const tx = decksCollection.update(lang, (draft) => {
			draft.review_answer_mode = next
		})
		tx.isPersisted.promise.then(
			() =>
				toastSuccess(
					next
						? 'Review answer mode updated for this deck.'
						: 'Deck will now use your profile setting.'
				),
			(error) => {
				toastError(
					'There was some error; please refresh the page to see if settings updated correctly.'
				)
				console.error('Review answer mode update error:', error)
			}
		)
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
					{hasOverride
						? 'Overriding the profile default: '
						: 'Currently using profile default: '}
					<strong>
						{profileMode === '2-buttons'
							? '2 buttons (Try Again, Correct!)'
							: '4 buttons (Again, Hard, Good, Easy)'}
					</strong>
				</p>
				<div data-testid="review-answer-mode-radio" className="space-y-2">
					{reviewAnswerModeOptions.map((option) => (
						<FancyChoiceButton
							key={option.value}
							option={option}
							selected={review_answer_mode === option.value}
							disabled={review_answer_mode === option.value}
							onClick={() => updateAnswerMode(option.value)}
						/>
					))}
				</div>
				<div>
					<Button
						variant="neutral"
						size="sm"
						disabled={!hasOverride}
						onClick={() => updateAnswerMode(null)}
						data-testid="clear-review-answer-mode-button"
					>
						Use profile default
					</Button>
				</div>
			</CardContent>
		</div>
	)
}
