import { useEffect } from 'react'
import { useProfile } from '@/hooks/use-profile'

const FONT_PREF_KEY = 'sunlo-font-preference'

/**
 * Applies the user's font preference to the document body.
 * Uses localStorage for immediate application on page load,
 * then syncs with profile data when available.
 */
export function useFontPreference() {
	const { data: profile } = useProfile()

	useEffect(() => {
		// Get preference from profile or localStorage
		const fontPref =
			profile?.font_preference ?? localStorage.getItem(FONT_PREF_KEY)

		// Apply the font class
		if (fontPref === 'dyslexic') {
			document.body.classList.add('font-dyslexic')
		} else {
			document.body.classList.remove('font-dyslexic')
		}

		// Sync localStorage with profile preference
		if (profile?.font_preference) {
			localStorage.setItem(FONT_PREF_KEY, profile.font_preference)
		}
	}, [profile?.font_preference])
}

/**
 * For use in non-authenticated contexts - applies font from localStorage only
 */
export function useLocalFontPreference() {
	useEffect(() => {
		const fontPref = localStorage.getItem(FONT_PREF_KEY)
		if (fontPref === 'dyslexic') {
			document.body.classList.add('font-dyslexic')
		}
	}, [])
}
