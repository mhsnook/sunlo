import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
	BookA,
	BookType,
	Columns2,
	Grid2x2,
	Volume2,
	VolumeX,
} from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/features/profile/collections'
import {
	type FontPreferenceType,
	MyProfileSchema,
	MyProfileType,
	type ReviewAnswerModeType,
} from '@/features/profile/schemas'
import { Label } from '@/components/ui/label'
import { InfoDialog } from '@/components/info-dialog'
import { cn } from '@/lib/utils'
import { cancelAllSounds, previewAllSounds } from '@/lib/review-sounds'

export function DisplayPreferences({ profile }: { profile: MyProfileType }) {
	return (
		<div className="space-y-8" data-testid="display-preferences-page">
			<FontPreferenceSection profile={profile} />
			<SoundPreferenceSection profile={profile} />
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
						currentPref === 'default'
							? 'border-primary bg-1-mlo-primary'
							: 'border-border hover:border-4-mlo-primary'
					)}
				>
					<BookA className="size-5 shrink-0" />
					<div>
						<span className="font-atkinson block font-medium">Default</span>
						<span className="text-muted-foreground font-atkinson text-sm">
							Atkinson Hyperlegible
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
						currentPref === 'dyslexic'
							? 'border-primary bg-1-mlo-primary'
							: 'border-border hover:border-4-mlo-primary'
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

function SoundPreferenceSection({ profile }: { profile: MyProfileType }) {
	const current = profile.sound_enabled

	useEffect(() => cancelAllSounds, [])

	const updateSoundPref = useMutation({
		mutationFn: async (sound_enabled: boolean) => {
			const { data } = await supabase
				.from('user_profile')
				.update({ sound_enabled })
				.eq('uid', profile.uid)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			if (data)
				myProfileCollection.utils.writeUpdate(MyProfileSchema.parse(data))
			toastSuccess('Sound preference updated')
		},
		onError: (error) => {
			toastError('Failed to update preference')
			console.log('Error', error)
		},
	})

	return (
		<div className="space-y-4" data-testid="sound-preference">
			<div className="space-y-2">
				<Label>Review sounds</Label>
				<p className="text-muted-foreground text-sm">
					Play a brief sound when you submit a review score.
				</p>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => {
						if (!current) updateSoundPref.mutate(true)
						previewAllSounds()
					}}
					disabled={updateSoundPref.isPending}
					data-testid="sound-preference-on"
					className={cn(
						'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						current
							? 'border-primary bg-1-mlo-primary'
							: 'border-border hover:border-4-mlo-primary'
					)}
				>
					<Volume2 className="size-5 shrink-0" />
					<span className="font-medium">On</span>
				</button>
				<button
					type="button"
					onClick={() => {
						cancelAllSounds()
						if (current) updateSoundPref.mutate(false)
					}}
					disabled={updateSoundPref.isPending}
					data-testid="sound-preference-off"
					className={cn(
						'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						!current
							? 'border-primary bg-1-mlo-primary'
							: 'border-border hover:border-4-mlo-primary'
					)}
				>
					<VolumeX className="size-5 shrink-0" />
					<span className="font-medium">Off</span>
				</button>
			</div>
		</div>
	)
}

function ReviewAnswerModeSection({ profile }: { profile: MyProfileType }) {
	const currentMode = profile.review_answer_mode ?? '2-buttons'

	const updateAnswerMode = useMutation({
		mutationFn: async (review_answer_mode: ReviewAnswerModeType) => {
			const { data } = await supabase
				.from('user_profile')
				.update({ review_answer_mode })
				.eq('uid', profile.uid)
				.select()
				.maybeSingle()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			if (data)
				myProfileCollection.utils.writeUpdate(MyProfileSchema.parse(data))
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
			<div className="flex gap-2" data-testid="review-answer-mode">
				<button
					type="button"
					onClick={() =>
						currentMode !== '4-buttons' && updateAnswerMode.mutate('4-buttons')
					}
					disabled={updateAnswerMode.isPending}
					data-testid="answer-mode-4-buttons"
					className={cn(
						'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						currentMode === '4-buttons'
							? 'border-primary bg-1-mlo-primary'
							: 'border-border hover:border-4-mlo-primary'
					)}
				>
					<Grid2x2 className="size-5 shrink-0" />
					<div>
						<span className="block font-medium">Show 4 answer choices</span>
						<span className="text-muted-foreground text-sm">
							Again, Hard, Good, Easy
						</span>
					</div>
				</button>
				<button
					type="button"
					onClick={() =>
						currentMode !== '2-buttons' && updateAnswerMode.mutate('2-buttons')
					}
					disabled={updateAnswerMode.isPending}
					data-testid="answer-mode-2-buttons"
					className={cn(
						'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						currentMode === '2-buttons'
							? 'border-primary bg-1-mlo-primary'
							: 'border-border hover:border-4-mlo-primary'
					)}
				>
					<Columns2 className="size-5 shrink-0" />
					<div>
						<span className="block font-medium">Show 2 answer choices</span>
						<span className="text-muted-foreground text-sm">
							Try Again, Correct!
						</span>
					</div>
				</button>
			</div>
		</div>
	)
}
