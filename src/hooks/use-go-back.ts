import { useEffectEvent } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useTitleBar } from '@/hooks/use-title-bar'

/**
 * The app's one definition of "back", shared by the navbar chevron and
 * Android's hardware button so the two never disagree.
 *
 * Three cases, in order: a route that names its own destination via
 * `titleBar.onBackClick` goes there; a route reached from somewhere inside the
 * app pops history; a route opened cold climbs one path segment.
 *
 * `isAtEntry` marks that third case — the user arrived here directly and there
 * is nothing behind them, which Android reads as "leave the app".
 */
export function useGoBack() {
	const navigate = useNavigate()
	const router = useRouter()
	const canGoBack = useCanGoBack()
	const titleBar = useTitleBar()

	const onBackClick =
		titleBar && 'onBackClick' in titleBar ? titleBar.onBackClick : null

	const goBack = useEffectEvent(() => {
		if (onBackClick) {
			void navigate({ to: onBackClick })
		} else if (canGoBack) {
			// Older WKWebView has no view transitions, and calling through the
			// missing method would throw instead of just skipping the animation.
			if (document.startViewTransition)
				document.startViewTransition(() => router.history.back())
			else router.history.back()
		} else {
			void navigate({ to: '..' })
		}
	})

	return { goBack, isAtEntry: !onBackClick && !canGoBack }
}
