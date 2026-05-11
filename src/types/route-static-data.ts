/**
 * Module augmentation for TanStack Router's StaticDataRouteOption so that
 * routes can declare their nav / layout / title config as static data
 * instead of returning it from beforeLoad.
 *
 * Why: keeps these flags introspectable from /admin/routes, makes the
 * route file's "shape in the UI" obvious without reading the function
 * body, and removes the need to wire context plumbing through beforeLoad.
 *
 * For values that branch on `auth.isAuth`, use the `{ auth, unauth }`
 * shape and resolve at render time via resolveNavList.
 *
 * For values that interpolate runtime params (e.g. `$lang`), pass a
 * function. It's called at render time with `{ params, isAuth }`; the
 * React Compiler memoizes the result.
 */
import type { TitleBar } from './main'

export type NavList = string[] | { auth: string[]; unauth: string[] }

export type TitleBarFn = (args: {
	params: Record<string, string>
	isAuth: boolean
}) => TitleBar

export type TitleBarStatic = TitleBar | TitleBarFn

declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		appnav?: NavList
		contextMenu?: NavList
		searchAction?: boolean
		focusMode?: boolean
		wideContent?: boolean
		fixedHeight?: boolean
		titleBar?: TitleBarStatic
	}
}

export function resolveNavList(
	list: NavList | undefined,
	isAuth: boolean
): string[] {
	if (!list) return []
	if (Array.isArray(list)) return list
	return isAuth ? list.auth : list.unauth
}

export function resolveTitleBar(
	tb: TitleBarStatic | undefined,
	args: { params: Record<string, string>; isAuth: boolean }
): TitleBar | undefined {
	if (!tb) return undefined
	if (typeof tb === 'function') return tb(args)
	return tb
}
