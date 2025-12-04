import type { RouteMatch } from '@tanstack/react-router'

type NavbarLoaderData = {
	titleBar?: {
		title?: string
		subtitle?: string
		onBackClick?: string | (() => void)
	}
	appnav?: string[]
	contextMenu?: string[]
}

export type NavbarMatch = RouteMatch<
	string,
	string,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
> & {
	loaderData?: NavbarLoaderData
}
