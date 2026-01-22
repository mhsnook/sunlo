const INTRO_STORAGE_PREFIX = 'sunlo-intro-'

export type IntroStatus = 'unseen' | 'seen' | 'affirmed'

export interface IntroState {
	status: IntroStatus
	seen: boolean
	affirmed: boolean
	markSeen: () => void
	markAffirmed: () => void
	reset: () => void
}

/**
 * Hook to track whether a user has seen or affirmed an intro/training.
 *
 * - "seen" = user has viewed the intro (can dismiss without action)
 * - "affirmed" = user has actively confirmed/acknowledged (required for gatekeeping)
 *
 * @param key - Unique identifier for this intro (e.g., 'deck-new', 'review', 'community-norms')
 */
export function useIntroSeen(key: string): IntroState {
	const storageKey = `${INTRO_STORAGE_PREFIX}${key}`

	const getStatus = (): IntroStatus => {
		if (typeof window === 'undefined') return 'unseen'
		const value = localStorage.getItem(storageKey)
		if (value === 'affirmed') return 'affirmed'
		if (value === 'seen') return 'seen'
		return 'unseen'
	}

	const status = getStatus()

	const markSeen = () => {
		if (typeof window === 'undefined') return
		// Only upgrade from unseen to seen, don't downgrade from affirmed
		if (getStatus() === 'unseen') {
			localStorage.setItem(storageKey, 'seen')
		}
	}

	const markAffirmed = () => {
		if (typeof window === 'undefined') return
		localStorage.setItem(storageKey, 'affirmed')
	}

	const reset = () => {
		if (typeof window === 'undefined') return
		localStorage.removeItem(storageKey)
	}

	return {
		status,
		seen: status === 'seen' || status === 'affirmed',
		affirmed: status === 'affirmed',
		markSeen,
		markAffirmed,
		reset,
	}
}

/**
 * Check if an intro has been seen without using the hook.
 * Useful for route guards and loaders.
 */
export function getIntroStatus(key: string): IntroStatus {
	if (typeof window === 'undefined') return 'unseen'
	const value = localStorage.getItem(`${INTRO_STORAGE_PREFIX}${key}`)
	if (value === 'affirmed') return 'affirmed'
	if (value === 'seen') return 'seen'
	return 'unseen'
}

/**
 * Mark an intro as affirmed outside of React.
 * Useful for route actions.
 */
export function setIntroAffirmed(key: string): void {
	if (typeof window === 'undefined') return
	localStorage.setItem(`${INTRO_STORAGE_PREFIX}${key}`, 'affirmed')
}

// Intro keys used throughout the app
export const INTRO_KEYS = {
	communityNorms: 'community-norms',
	deckNew: 'deck-new',
	review: 'review',
	deckSettings: 'deck-settings',
	editTranslation: 'edit-translation',
} as const
