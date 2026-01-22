import { useState } from 'react'

const INTRO_STORAGE_PREFIX = 'sunlo-intro-'

export type IntroStatus = 'unseen' | 'seen' | 'affirmed'

export interface UseIntroResult {
	/** Current status: 'unseen', 'seen', or 'affirmed' */
	status: IntroStatus
	/** Whether the intro dialog should be open */
	isOpen: boolean
	/** Whether to show the small callout (user has seen but might want to revisit) */
	showCallout: boolean
	/** Whether user needs to affirm (for affirmation-required intros) */
	needsAffirmation: boolean
	/** Close the dialog and mark as seen */
	handleClose: () => void
	/** Close the dialog and mark as affirmed */
	handleAffirm: () => void
	/** Reopen the dialog */
	handleReopen: () => void
	/** Reset to unseen state */
	reset: () => void
}

/**
 * Hook to manage intro/training state.
 *
 * @param key - Unique identifier (e.g., 'review', 'deck-new', 'community-norms')
 * @param options.requireAffirmation - If true, user must actively affirm (can't just dismiss)
 *
 * @example
 * // Simple intro (can be dismissed)
 * const { isOpen, showCallout, handleClose, handleReopen } = useIntro('review')
 *
 * // Affirmation required (must click "I agree")
 * const { isOpen, needsAffirmation, handleAffirm } = useIntro('community-norms', { requireAffirmation: true })
 */
export function useIntro(
	key: string,
	options?: { requireAffirmation?: boolean }
): UseIntroResult {
	const requireAffirmation = options?.requireAffirmation ?? false
	const storageKey = `${INTRO_STORAGE_PREFIX}${key}`

	const getStatus = (): IntroStatus => {
		if (typeof window === 'undefined') return 'unseen'
		const value = localStorage.getItem(storageKey)
		if (value === 'affirmed') return 'affirmed'
		if (value === 'seen') return 'seen'
		return 'unseen'
	}

	const status = getStatus()
	const [isOpen, setIsOpen] = useState(status === 'unseen')

	const markSeen = () => {
		if (typeof window === 'undefined') return
		if (getStatus() === 'unseen') {
			localStorage.setItem(storageKey, 'seen')
		}
	}

	const markAffirmed = () => {
		if (typeof window === 'undefined') return
		localStorage.setItem(storageKey, 'affirmed')
	}

	const handleClose = () => {
		markSeen()
		setIsOpen(false)
	}

	const handleAffirm = () => {
		markAffirmed()
		setIsOpen(false)
	}

	const handleReopen = () => setIsOpen(true)

	const reset = () => {
		if (typeof window === 'undefined') return
		localStorage.removeItem(storageKey)
	}

	// For affirmation-required intros, "seen" alone isn't enough
	const needsAffirmation = requireAffirmation && status !== 'affirmed'

	return {
		status,
		isOpen,
		showCallout: status !== 'unseen',
		needsAffirmation,
		handleClose,
		handleAffirm,
		handleReopen,
		reset,
	}
}

/**
 * Check intro status outside of React.
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
 */
export function setIntroAffirmed(key: string): void {
	if (typeof window === 'undefined') return
	localStorage.setItem(`${INTRO_STORAGE_PREFIX}${key}`, 'affirmed')
}
