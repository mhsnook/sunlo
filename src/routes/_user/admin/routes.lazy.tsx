import { type CSSProperties, type ReactNode, useMemo, useState } from 'react'
import { createLazyFileRoute, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import type {
	NavList,
	SearchScope,
	TitleBarStatic,
} from '@/types/route-static-data'
import type { StaticDataRouteOption } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_user/admin/routes')({
	component: RoutesIntrospection,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

type Row = {
	id: string
	path: string
	isLazy: boolean
	appnav?: NavList
	contextMenu?: NavList
	titleBar?: TitleBarStatic
	search: SearchScope | undefined
	focusMode: boolean
	wideContent: boolean
	fixedHeight: boolean
}

type RouteLike = {
	id: string
	fullPath?: string
	path?: string
	lazyFn?: unknown
	options?: {
		staticData?: StaticDataRouteOption
	}
}

function readRows(routesById: Record<string, RouteLike>): Row[] {
	return Object.entries(routesById).map(([id, route]) => {
		const sd = route.options?.staticData ?? {}
		return {
			id,
			path: route.fullPath ?? route.path ?? id,
			isLazy: typeof route.lazyFn === 'function',
			appnav: sd.appnav,
			contextMenu: sd.contextMenu,
			titleBar: sd.titleBar,
			search: sd.search,
			focusMode: sd.focusMode === true,
			wideContent: sd.wideContent === true,
			fixedHeight: sd.fixedHeight === true,
		}
	})
}

function RoutesIntrospection() {
	const router = useRouter()
	const [filter, setFilter] = useState('')

	const rows = useMemo(
		() =>
			readRows(router.routesById as unknown as Record<string, RouteLike>).sort(
				(a, b) => a.id.localeCompare(b.id)
			),
		[router]
	)

	const filtered = useMemo(() => {
		if (!filter) return rows
		const f = filter.toLowerCase()
		return rows.filter((r) => r.id.toLowerCase().includes(f))
	}, [rows, filter])

	const counts = useMemo(
		() => ({
			total: rows.length,
			lazy: rows.filter((r) => r.isLazy).length,
			titleBar: rows.filter((r) => r.titleBar !== undefined).length,
			appnav: rows.filter((r) => r.appnav !== undefined).length,
			ctxmenu: rows.filter((r) => r.contextMenu !== undefined).length,
			search: rows.filter((r) => r.search !== undefined).length,
			focus: rows.filter((r) => r.focusMode).length,
			wide: rows.filter((r) => r.wideContent).length,
			fixed: rows.filter((r) => r.fixedHeight).length,
		}),
		[rows]
	)

	return (
		<main style={style} className="space-y-4" data-testid="admin-routes-page">
			<header>
				<h1 className="text-2xl font-bold">Route tree</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					{counts.total} routes · {counts.lazy} lazy · {counts.titleBar}{' '}
					titleBar · {counts.appnav} appnav · {counts.ctxmenu} contextMenu ·{' '}
					{counts.search} search · {counts.focus} focusMode · {counts.wide}{' '}
					wideContent · {counts.fixed} fixedHeight
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Everything read from <code>staticData</code>. Dynamic titleBar values
					(functions of params / isAuth) are shown as <em>(fn)</em>.
				</p>
			</header>

			<Input
				type="text"
				placeholder="Filter by id…"
				value={filter}
				onChange={(e) => setFilter(e.target.value)}
				className="max-w-md"
			/>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-background sticky top-0 z-10 shadow-[0_1px_0_var(--border)]">
						<tr className="text-muted-foreground text-left text-xs tracking-wider uppercase">
							<Th>Route id</Th>
							<Th>load</Th>
							<Th>titleBar</Th>
							<Th>appnav</Th>
							<Th>contextMenu</Th>
							<Th center>search</Th>
							<Th center>focus</Th>
							<Th center>wide</Th>
							<Th center>fixed</Th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr
								key={r.id}
								className="border-b align-top"
								data-name="admin-route-row"
								data-key={r.id}
							>
								<td className="px-2 py-1.5 font-mono text-xs">{r.id}</td>
								<LoadCell isLazy={r.isLazy} />
								<TitleBarCell tb={r.titleBar} />
								<NavCell list={r.appnav} />
								<NavCell list={r.contextMenu} />
								<SearchCell scope={r.search} />
								<BoolCell on={r.focusMode} />
								<BoolCell on={r.wideContent} />
								<BoolCell on={r.fixedHeight} />
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</main>
	)
}

function Th({ children, center }: { children: ReactNode; center?: boolean }) {
	return (
		<th className={cn('px-2 py-2 font-semibold', center ? 'text-center' : '')}>
			{children}
		</th>
	)
}

function LoadCell({ isLazy }: { isLazy: boolean }) {
	return (
		<td className="px-2 py-1.5 text-xs">
			<span
				className={cn(
					'inline-block rounded px-1.5 py-0.5 font-mono',
					isLazy
						? 'bg-lc-1 bg-chroma-mlo bg-hue-info text-lc-7 text-chroma-hi text-hue-info'
						: 'bg-lc-1 bg-chroma-mlo bg-hue-neutral text-muted-foreground'
				)}
			>
				{isLazy ? 'lazy' : 'eager'}
			</span>
		</td>
	)
}

function BoolCell({ on }: { on: boolean }) {
	return (
		<td
			className={cn(
				'px-2 py-1.5 text-center',
				on
					? 'text-lc-7 text-chroma-hi text-hue-success'
					: 'text-muted-foreground'
			)}
		>
			{on ? '✓' : '·'}
		</td>
	)
}

function SearchCell({ scope }: { scope: SearchScope | undefined }) {
	if (scope === undefined)
		return <td className="text-muted-foreground px-2 py-1.5 text-center">·</td>
	return (
		<td className="text-lc-7 text-chroma-hi text-hue-success px-2 py-1.5 text-center font-mono text-xs">
			{scope}
		</td>
	)
}

function TitleBarCell({ tb }: { tb: TitleBarStatic | undefined }) {
	if (tb === undefined)
		return <td className="text-muted-foreground px-2 py-1.5 text-xs">·</td>
	if (typeof tb === 'function')
		return <td className="text-muted-foreground px-2 py-1.5 text-xs">(fn)</td>
	return (
		<td className="px-2 py-1.5 text-xs">
			<div className="font-medium">{tb.title}</div>
			{tb.subtitle ? (
				<div className="text-muted-foreground">{tb.subtitle}</div>
			) : null}
		</td>
	)
}

function fmtList(arr: string[]): string {
	return arr.length === 0 ? '[]' : arr.join(', ')
}

function NavCell({ list }: { list: NavList | undefined }) {
	if (list === undefined)
		return <td className="text-muted-foreground px-2 py-1.5 text-xs">·</td>
	// Flat array shape: string[] — same for both auth states.
	if (typeof list[0] === 'string' || list.length === 0)
		return (
			<td className="px-2 py-1.5 font-mono text-xs">
				{fmtList(list as string[])}
			</td>
		)
	// Tuple shape: [authArr] or [authArr, unauthArr]
	const authArr = list[0]
	const unauthArr = (list[1] ?? null) as string[] | null
	return (
		<td className="px-2 py-1.5 font-mono text-xs">
			<div>
				<span className="text-muted-foreground">auth:</span> {fmtList(authArr)}
			</div>
			<div>
				<span className="text-muted-foreground">unauth:</span>{' '}
				{unauthArr === null ? '(hidden)' : fmtList(unauthArr)}
			</div>
		</td>
	)
}
