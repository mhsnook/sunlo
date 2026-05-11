/**
 * Module augmentation for TanStack Router's StaticDataRouteOption so that
 * routes can declare their nav / layout config as static data instead of
 * returning it from beforeLoad.
 *
 * Why: keeps these flags introspectable from /admin/routes, makes the
 * route file's "shape in the UI" obvious without reading the function
 * body, and removes the need to wire context plumbing through beforeLoad.
 *
 * For values that previously branched on `context.auth.isAuth`, use the
 * `{ auth, unauth }` shape and resolve at render time via the helper
 * below.
 *
 * titleBar is NOT included here — several routes interpolate runtime
 * params (e.g. `Review ${languages[lang]} cards`), so it stays in
 * beforeLoad / context.
 */
export type NavList = string[] | { auth: string[]; unauth: string[] }

declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		appnav?: NavList
		contextMenu?: NavList
		searchAction?: boolean
		focusMode?: boolean
		wideContent?: boolean
		fixedHeight?: boolean
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
