import { useEffect } from 'react'
import {
	BookA,
	BookType,
	Columns2,
	Grid2x2,
	MonitorCog,
	Moon,
	Sun,
	Volume2,
	VolumeX,
} from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { myProfileCollection } from '@/features/profile/collections'
import {
	type FontPreferenceType,
	MyProfileType,
	type ReviewAnswerModeType,
} from '@/features/profile/schemas'
import { Label } from '@/components/ui/label'
import { InfoDialog } from '@/components/info-dialog'
import { ChoiceTile } from '@/components/ui/choice-tile'
import { cancelAllSounds, previewAllSounds } from '@/lib/review-sounds'
import { useTheme } from '@/components/theme-provider'

export function DisplayPreferences({
	profile,
}: {
	profile: MyProfileType | null
}) {
	return (
		<div className="space-y-8" data-testid="display-preferences-page">
			<ThemeSection />
			{profile ? (
				<>
					<FontPreferenceSection profile={profile} />
					<SoundPreferenceSection profile={profile} />
					<ReviewAnswerModeSection profile={profile} />
				</>
			) : null}
		</div>
	)
}

function ThemeSection() {
	const { theme, setTheme } = useTheme()
	return (
		<div className="space-y-4" data-testid="theme-preference">
			<div className="space-y-2">
				<Label>Appearance</Label>
				<p className="text-muted-foreground text-sm">
					Choose light, dark, or follow your system setting.
				</p>
			</div>
			<div className="flex gap-2">
				<ChoiceTile
					selected={theme === 'light'}
					onClick={() => setTheme('light')}
					data-key="light"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<Sun className="size-5 shrink-0" />
					<span className="font-medium">Light</span>
				</ChoiceTile>
				<ChoiceTile
					selected={theme === 'dark'}
					onClick={() => setTheme('dark')}
					data-key="dark"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<Moon className="size-5 shrink-0" />
					<span className="font-medium">Dark</span>
				</ChoiceTile>
				<ChoiceTile
					selected={theme === 'system'}
					onClick={() => setTheme('system')}
					data-key="system"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<MonitorCog className="size-5 shrink-0" />
					<span className="font-medium">System</span>
				</ChoiceTile>
			</div>
		</div>
	)
}

function FontPreferenceSection({ profile }: { profile: MyProfileType }) {
	const currentPref = profile.font_preference ?? 'default'

	const handleFontChange = (font_preference: FontPreferenceType) => {
		if (font_preference === currentPref) return
		const tx = myProfileCollection.update(profile.uid, (draft) => {
			draft.font_preference = font_preference
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('Font preference updated'),
			(err) => {
				toastError('Failed to update preference')
				console.error('Font preference update rolled back:', err)
			}
		)
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
				<ChoiceTile
					selected={currentPref === 'default'}
					onClick={() => handleFontChange('default')}
					data-key="default"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<BookA className="size-5 shrink-0" />
					<div>
						<span className="font-atkinson block font-medium">Default</span>
						<span className="text-muted-foreground font-atkinson text-sm">
							Atkinson Hyperlegible
						</span>
					</div>
				</ChoiceTile>
				<ChoiceTile
					selected={currentPref === 'dyslexic'}
					onClick={() => handleFontChange('dyslexic')}
					data-key="dyslexic"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
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
				</ChoiceTile>
			</div>
		</div>
	)
}

function SoundPreferenceSection({ profile }: { profile: MyProfileType }) {
	const current = profile.sound_enabled

	useEffect(() => cancelAllSounds, [])

	const updateSoundPref = (sound_enabled: boolean) => {
		const tx = myProfileCollection.update(profile.uid, (draft) => {
			draft.sound_enabled = sound_enabled
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('Sound preference updated'),
			(err) => {
				toastError('Failed to update preference')
				console.error('Sound preference update rolled back:', err)
			}
		)
	}

	return (
		<div className="space-y-4" data-testid="sound-preference">
			<div className="space-y-2">
				<Label>Review sounds</Label>
				<p className="text-muted-foreground text-sm">
					Play a brief sound when you submit a review score.
				</p>
			</div>
			<div className="flex gap-2">
				<ChoiceTile
					selected={current}
					onClick={() => {
						if (!current) updateSoundPref(true)
						previewAllSounds()
					}}
					data-key="on"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<Volume2 className="size-5 shrink-0" />
					<span className="font-medium">On</span>
				</ChoiceTile>
				<ChoiceTile
					selected={!current}
					onClick={() => {
						cancelAllSounds()
						if (current) updateSoundPref(false)
					}}
					data-key="off"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<VolumeX className="size-5 shrink-0" />
					<span className="font-medium">Off</span>
				</ChoiceTile>
			</div>
		</div>
	)
}

function ReviewAnswerModeSection({ profile }: { profile: MyProfileType }) {
	const currentMode = profile.review_answer_mode ?? '2-buttons'

	const updateAnswerMode = (review_answer_mode: ReviewAnswerModeType) => {
		if (review_answer_mode === currentMode) return
		const tx = myProfileCollection.update(profile.uid, (draft) => {
			draft.review_answer_mode = review_answer_mode
		})
		tx.isPersisted.promise.then(
			() => toastSuccess('Review answer mode updated'),
			(err) => {
				toastError('Failed to update review answer mode')
				console.error('Review answer mode update rolled back:', err)
			}
		)
	}

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
				<ChoiceTile
					selected={currentMode === '4-buttons'}
					onClick={() => updateAnswerMode('4-buttons')}
					data-key="4-buttons"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<Grid2x2 className="size-5 shrink-0" />
					<div>
						<span className="block font-medium">Show 4 answer choices</span>
						<span className="text-muted-foreground text-sm">
							Again, Hard, Good, Easy
						</span>
					</div>
				</ChoiceTile>
				<ChoiceTile
					selected={currentMode === '2-buttons'}
					onClick={() => updateAnswerMode('2-buttons')}
					data-key="2-buttons"
					className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
				>
					<Columns2 className="size-5 shrink-0" />
					<div>
						<span className="block font-medium">Show 2 answer choices</span>
						<span className="text-muted-foreground text-sm">
							Try Again, Correct!
						</span>
					</div>
				</ChoiceTile>
			</div>
		</div>
	)
}
