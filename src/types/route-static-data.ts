/**
 * Module augmentation for TanStack Router's StaticDataRouteOption so that
 * routes can declare their nav / layout / title config as static data
 * instead of returning it from beforeLoad.
 *
 * Why: keeps these flags introspectable from /admin/routes, makes the
 * route file's "shape in the UI" obvious without reading the function
 * body, and removes the need to wire context plumbing through beforeLoad.
 *
 * NavList shape:
 *   - string[]                    same for everyone
 *   - [string[]]                  shown when logged in, hidden when not
 *   - [string[], string[]]        [authArr, unauthArr]
 *
 * Resolve at the call site:
 *   !Array.isArray(list[0]) ? list : isAuth ? list[0] : list[1] ?? []
 *
 * TitleBar can be either a static object or a function called at render
 * time with `{ params, isAuth }`. React Compiler memoizes the result.
 */
import type { TitleBar } from './main'

export type NavList = string[] | [string[]] | [string[], string[]]

export type TitleBarFn = (args: {
	params: Record<string, string>
	isAuth: boolean
}) => TitleBar

export type TitleBarStatic = TitleBar | TitleBarFn

/**
 * Which search overlay a route opts into. Resolved by walking `matches` in
 * the `_user` layout (the same way `titleBar` is resolved) so the overlay,
 * Ctrl+K handler, and `?search=true` validateSearch live in exactly one place.
 *   - 'content'  → public-library search (phrases / playlists / requests)
 *   - 'profiles' → people search (friends, public profiles)
 */
export type SearchScope = 'content' | 'profiles'

declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		appnav?: NavList
		contextMenu?: NavList
		search?: SearchScope
		focusMode?: boolean
		wideContent?: boolean
		fixedHeight?: boolean
		titleBar?: TitleBarStatic
	}
}

/**
 * Resolve a NavList to a flat array of route ids.
 *   string[]                 → returned as-is
 *   [string[]]               → returned when isAuth, [] otherwise (hidden)
 *   [string[], string[]]     → list[0] when isAuth, list[1] when not
 */
export function resolveNavList(
	list: NavList | undefined,
	isAuth: boolean
): string[] {
	if (!list) return []
	if (!Array.isArray(list[0])) return list as string[]
	const tuple = list as [string[]] | [string[], string[]]
	return isAuth ? tuple[0] : (tuple[1] ?? [])
}
