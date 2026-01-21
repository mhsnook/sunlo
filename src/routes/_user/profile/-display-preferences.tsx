import { useMutation } from '@tanstack/react-query'
import { toast, toastError } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/lib/collections'
import {
	FontPreferenceType,
	MyProfileSchema,
	MyProfileType,
} from '@/lib/schemas'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function DisplayPreferences({ profile }: { profile: MyProfileType }) {
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
			toast.success('Display preference updated')
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
		<div className="space-y-4">
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
					className={cn(
						'flex-1 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						currentPref === 'default' ?
							'border-primary bg-primary/10'
						:	'border-border hover:border-primary/50'
					)}
				>
					<span className="font-instrument block font-medium">Default</span>
					<span className="text-muted-foreground font-instrument text-sm">
						Instrument Sans
					</span>
				</button>
				<button
					type="button"
					onClick={() => handleFontChange('dyslexic')}
					disabled={updateFontPref.isPending}
					className={cn(
						'flex-1 rounded-2xl border-2 px-4 py-3 text-start transition-colors',
						currentPref === 'dyslexic' ?
							'border-primary bg-primary/10'
						:	'border-border hover:border-primary/50'
					)}
				>
					<span className="font-dyslexic block font-medium">
						Dyslexia-friendly
					</span>
					<span className="font-dyslexic text-muted-foreground text-sm">
						OpenDyslexic
					</span>
				</button>
			</div>
		</div>
	)
}
