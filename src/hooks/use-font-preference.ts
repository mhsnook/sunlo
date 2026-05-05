import { useEffect } from 'react'
import { useProfile } from '@/features/profile/hooks'

export function useFontPreference() {
	const { data: profile } = useProfile()

	useEffect(() => {
		if (profile?.font_preference === 'dyslexic') {
			document.body.classList.add('font-dyslexic')
		} else {
			document.body.classList.remove('font-dyslexic')
		}
	}, [profile?.font_preference])
}
