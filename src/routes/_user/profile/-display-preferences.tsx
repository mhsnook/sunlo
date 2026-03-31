import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BookA, BookText, Columns2, Grid2x2 } from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/features/profile/collections'
import {
	FontPreferenceSchema,
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

export function DisplayPreferences({ profile }: { profile: MyProfileType }) {
	return (
		<div className="space-y-8">
			<FontPreferenceSection profile={profile} />
			<ReviewAnswerModeSection profile={profile} />
		</div>
	)
}

const fontPreferenceOptions: Array<FancySelectOption> = [
	{
		value: 'default',
		label: 'Default',
		description: 'Instrument Sans',
		Icon: BookA,
	},
	{
		value: 'dyslexic',
		label: 'Dyslexia-friendly',
		description: 'OpenDyslexic',
		Icon: BookText,
	},
]

const FontPreferenceFormSchema = z.object({
	font_preference: FontPreferenceSchema,
})

type FontPreferenceFormInputs = z.infer<typeof FontPreferenceFormSchema>

function FontPreferenceSection({ profile }: { profile: MyProfileType }) {
	const currentPref = profile.font_preference ?? 'default'

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<FontPreferenceFormInputs>({
		resolver: zodResolver(FontPreferenceFormSchema),
		defaultValues: { font_preference: currentPref },
	})

	const updateFontPref = useMutation({
		mutationFn: async (values: FontPreferenceFormInputs) => {
			const { data } = await supabase
				.from('user_profile')
				.update({ font_preference: values.font_preference })
				.eq('uid', profile.uid)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			if (data)
				myProfileCollection.utils.writeUpdate(MyProfileSchema.parse(data))
			reset({ font_preference: data?.font_preference ?? currentPref })
			toastSuccess('Font preference updated')
		},
		onError: (error) => {
			toastError('Failed to update preference')
			console.log('Error', error)
		},
	})

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Font Style</Label>
				<p className="text-muted-foreground text-sm">
					Choose a font that works best for you. The dyslexia-friendly font
					(OpenDyslexic) may help with readability.
				</p>
			</div>
			<form
				noValidate
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit((data) => updateFontPref.mutate(data))}
				className="space-y-4"
			>
				<FancySelectField<FontPreferenceFormInputs>
					name="font_preference"
					control={control}
					error={errors.font_preference}
					options={fontPreferenceOptions}
				/>
				<div className="space-x-2">
					<Button type="submit" disabled={!isDirty}>
						Update font
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
				/>
				<div className="space-x-2">
					<Button type="submit" disabled={!isDirty}>
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
