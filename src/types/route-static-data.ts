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

declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		appnav?: NavList
		contextMenu?: NavList
		searchAction?: boolean
		focusMode?: boolean
		wideContent?: boolean
		fixedHeight?: boolean
		fullWidth?: boolean
		titleBar?: TitleBarStatic
	}
}
