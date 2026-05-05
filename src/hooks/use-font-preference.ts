import { useEffect } from 'react'
import { useProfile } from '@/features/profile/hooks'
import { FONT_PREF_KEY } from '@/lib/ui-prefs'

export function useFontPreference() {
	const { data: profile } = useProfile()

	useEffect(() => {
		const fontPref =
			profile?.font_preference ?? localStorage.getItem(FONT_PREF_KEY)

		if (fontPref === 'dyslexic') {
			document.body.classList.add('font-dyslexic')
		} else {
			document.body.classList.remove('font-dyslexic')
		}

		if (profile?.font_preference) {
			localStorage.setItem(FONT_PREF_KEY, profile.font_preference)
		}
	}, [profile?.font_preference])
}
