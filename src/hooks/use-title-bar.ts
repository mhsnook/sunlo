import { useMatches } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import type { TitleBar } from '@/types/main'

/**
 * Resolves the deepest matching route's titleBar from staticData. If the
 * value is a function, it's invoked with the match's params and the
 * current auth state. React Compiler memoizes the call.
 */
export function useTitleBar(): TitleBar | undefined {
	const matches = useMatches()
	const { isAuth } = useAuth()
	const match = matches.findLast((m) => m.staticData.titleBar)
	const tb = match?.staticData.titleBar
	if (!tb) return undefined
	if (typeof tb === 'function')
		return tb({
			params: (match?.params ?? {}) as Record<string, string>,
			isAuth,
		})
	return tb
}
