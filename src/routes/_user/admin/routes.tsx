import { type CSSProperties, type ReactNode, useMemo, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { NavList } from '@/types/route-static-data'

export const Route = createFileRoute('/_user/admin/routes')({
	component: RoutesIntrospection,
	beforeLoad: () => ({
		titleBar: {
			title: 'Routes',
			subtitle: 'Static introspection of the route tree',
		},
	}),
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

type Row = {
	id: string
	path: string
	isLazy: boolean
	appnav?: NavList
	contextMenu?: NavList
	searchAction: boolean
	focusMode: boolean
	wideContent: boolean
	fixedHeight: boolean
}

type RouteLike = {
	id: string
	fullPath?: string
	path?: string
	options?: {
		lazyFn?: unknown
		staticData?: {
			appnav?: NavList
			contextMenu?: NavList
			searchAction?: boolean
			focusMode?: boolean
			wideContent?: boolean
			fixedHeight?: boolean
		}
	}
}

function readRows(routesById: Record<string, RouteLike>): Row[] {
	return Object.entries(routesById).map(([id, route]) => {
		const sd = route.options?.staticData ?? {}
		return {
			id,
			path: route.fullPath ?? route.path ?? id,
			isLazy: typeof route.options?.lazyFn === 'function',
			appnav: sd.appnav,
			contextMenu: sd.contextMenu,
			searchAction: sd.searchAction === true,
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
			appnav: rows.filter((r) => r.appnav !== undefined).length,
			ctxmenu: rows.filter((r) => r.contextMenu !== undefined).length,
			search: rows.filter((r) => r.searchAction).length,
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
					{counts.total} routes · {counts.lazy} lazy · {counts.appnav} appnav ·{' '}
					{counts.ctxmenu} contextMenu · {counts.search} search · {counts.focus}{' '}
					focusMode · {counts.wide} wideContent · {counts.fixed} fixedHeight
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Nav and layout flags read from <code>staticData</code>. titleBar still
					lives in <code>beforeLoad</code> (it sometimes interpolates runtime
					params like <code>$lang</code>).
				</p>
			</header>

			<input
				type="text"
				placeholder="Filter by id…"
				value={filter}
				onChange={(e) => setFilter(e.target.value)}
				className="border-3-mlo-primary bg-card w-full max-w-md rounded-2xl border px-3 py-2 text-sm"
			/>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="text-muted-foreground">
						<tr className="border-b text-left text-xs tracking-wider uppercase">
							<Th>Route id</Th>
							<Th center>Lazy</Th>
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
								className="hover:bg-1-mlo-primary/40 border-b align-top"
								data-name="admin-route-row"
								data-key={r.id}
							>
								<td className="py-1.5 pr-4 font-mono text-xs">{r.id}</td>
								<BoolCell on={r.isLazy} />
								<NavCell list={r.appnav} />
								<NavCell list={r.contextMenu} />
								<BoolCell on={r.searchAction} />
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
		<th className={cn('py-2 font-semibold', center ? 'text-center' : '')}>
			{children}
		</th>
	)
}

function BoolCell({ on }: { on: boolean }) {
	return (
		<td
			className={cn(
				'py-1.5 text-center',
				on ? 'text-7-hi-success' : 'text-muted-foreground'
			)}
		>
			{on ? '✓' : '·'}
		</td>
	)
}

function NavCell({ list }: { list: NavList | undefined }) {
	if (list === undefined)
		return <td className="text-muted-foreground py-1.5 pr-4 text-xs">·</td>
	if (Array.isArray(list))
		return (
			<td className="py-1.5 pr-4 font-mono text-xs">
				{list.length === 0 ? '[]' : list.join(', ')}
			</td>
		)
	return (
		<td className="py-1.5 pr-4 font-mono text-xs">
			<div>
				<span className="text-muted-foreground">auth:</span>{' '}
				{list.auth.length === 0 ? '[]' : list.auth.join(', ')}
			</div>
			<div>
				<span className="text-muted-foreground">unauth:</span>{' '}
				{list.unauth.length === 0 ? '[]' : list.unauth.join(', ')}
			</div>
		</td>
	)
}
