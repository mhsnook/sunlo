import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BookA, BookType, Columns2, Grid2x2 } from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/features/profile/collections'
import {
	type FontPreferenceType,
	MyProfileSchema,
	MyProfileType,
	ReviewAnswerModeSchema,
	type ReviewAnswerModeType,
} from '@/features/profile/schemas'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { InfoDialog } from '@/components/info-dialog'
import {
	FancySelectField,
	type FancySelectOption,
} from '@/components/fields/fancy-select-field'
import { cn } from '@/lib/utils'

export function DisplayPreferences({ profile }: { profile: MyProfileType }) {
	return (
		<div className="space-y-8" data-testid="display-preferences-page">
			<FontPreferenceSection profile={profile} />
			<ReviewAnswerModeSection profile={profile} />
		</div>
	)
}

function FontPreferenceSection({ profile }: { profile: MyProfileType }) {
	const currentPref = profile.font_preference ?? 'default'

	const updateFontPref = useMutation({
		mutationFn: async (font_preference: FontPreferenceType) => {
			const { data } = await supabase
				.from('user_profile')
				.update({ font_preference })
				.eq('uid', profile.uid)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			if (data)
				myProfileCollection.utils.writeUpdate(MyProfileSchema.parse(data))
			toastSuccess('Font preference updated')
		},
		onError: (error) => {
			toastError('Failed to update preference')
			console.log('Error', error)
		},
	})

	const handleFontChange = (pref: FontPreferenceType) => {
		if (pref !== currentPref) {
			updateFontPref.mutate(pref)
		}
	}

	return (
		<div className="space-y-4" data-testid="font-preference">
			<div className="space-y-2">
				<Label>Font Style</Label>
				<p className="text-muted-foreground text-sm">
					Choose a font that works best for you. The dyslexia-friendly font
					(OpenDyslexic) may help with readability.
				</p>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => handleFontChange('default')}
					disabled={updateFontPref.isPending}
					data-testid="font-preference-default"
					className={cn(
						'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						currentPref === 'default' ?
							'border-primary bg-1-mlo-primary'
						:	'border-border hover:border-4-mlo-primary'
					)}
				>
					<BookA className="size-5 shrink-0" />
					<div>
						<span className="font-instrument block font-medium">Default</span>
						<span className="text-muted-foreground font-instrument text-sm">
							Instrument Sans
						</span>
					</div>
				</button>
				<button
					type="button"
					onClick={() => handleFontChange('dyslexic')}
					disabled={updateFontPref.isPending}
					data-testid="font-preference-dyslexic"
					className={cn(
						'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						currentPref === 'dyslexic' ?
							'border-primary bg-1-mlo-primary'
						:	'border-border hover:border-4-mlo-primary'
					)}
				>
					<BookType className="size-5 shrink-0" />
					<div>
						<span className="font-dyslexic block font-medium">
							Dyslexia-friendly
						</span>
						<span className="font-dyslexic text-muted-foreground text-sm">
							OpenDyslexic
						</span>
					</div>
				</button>
			</div>
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

const ReviewAnswerModeFormSchema = z.object({
	review_answer_mode: ReviewAnswerModeSchema,
})

type ReviewAnswerModeFormInputs = z.infer<typeof ReviewAnswerModeFormSchema>

function ReviewAnswerModeSection({ profile }: { profile: MyProfileType }) {
	const currentMode = profile.review_answer_mode ?? '4-buttons'

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<ReviewAnswerModeFormInputs>({
		resolver: zodResolver(ReviewAnswerModeFormSchema),
		defaultValues: { review_answer_mode: currentMode },
	})

	const updateAnswerMode = useMutation({
		mutationFn: async (values: ReviewAnswerModeFormInputs) => {
			const { data } = await supabase
				.from('user_profile')
				.update({
					review_answer_mode: values.review_answer_mode,
				})
				.eq('uid', profile.uid)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			if (data)
				myProfileCollection.utils.writeUpdate(MyProfileSchema.parse(data))
			reset({
				review_answer_mode:
					(data?.review_answer_mode as ReviewAnswerModeType) ?? currentMode,
			})
			toastSuccess('Review answer mode updated')
		},
		onError: (error) => {
			toastError('Failed to update review answer mode')
			console.log('Error', error)
		},
	})

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Label>Review answer choices</Label>
				<InfoDialog title="Review Answer Choices">
					<p>
						In Spaced-Repetition (SRS) systems the default is usually to show 4
						options: &ldquo;Again&rdquo; when you couldn&rsquo;t remember the
						card, and three options for &ldquo;Hard, Good, Easy&rdquo; when you
						could. The SRS algorithm benefits slightly from the increased
						precision, but not very much. So some users prefer just 2 buttons,
						&ldquo;No&rdquo; and &ldquo;Yes&rdquo;, which are equivalent to
						&ldquo;Again&rdquo; and &ldquo;Good&rdquo;.
					</p>
				</InfoDialog>
			</div>
			<form
				noValidate
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit((data) => updateAnswerMode.mutate(data))}
				className="space-y-4"
			>
				<FancySelectField<ReviewAnswerModeFormInputs>
					name="review_answer_mode"
					control={control}
					error={errors.review_answer_mode}
					options={reviewAnswerModeOptions}
					data-testid="review-answer-mode"
				/>
				<div className="space-x-2">
					<Button
						type="submit"
						disabled={!isDirty}
						data-testid="update-answer-mode-button"
					>
						Update answer mode
					</Button>
					<Button
						variant="neutral"
						type="button"
						onClick={() => reset()}
						disabled={!isDirty}
					>
						Clear
					</Button>
				</div>
			</form>
		</div>
	)
}
