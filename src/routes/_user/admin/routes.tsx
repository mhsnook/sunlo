import { type CSSProperties, type ReactNode, useMemo, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

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
	focusMode: boolean
	wideContent: boolean
	fixedHeight: boolean
}

function readRows(routesById: Record<string, unknown>): Row[] {
	return Object.entries(routesById).map(([id, route]) => {
		const r = route as {
			id: string
			fullPath?: string
			path?: string
			options?: {
				lazyFn?: unknown
				staticData?: {
					focusMode?: boolean
					wideContent?: boolean
					fixedHeight?: boolean
				}
			}
		}
		const sd = r.options?.staticData ?? {}
		return {
			id,
			path: r.fullPath ?? r.path ?? id,
			isLazy: typeof r.options?.lazyFn === 'function',
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
			readRows(router.routesById as unknown as Record<string, unknown>).sort(
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
					{counts.total} routes · {counts.lazy} lazy · {counts.focus} focusMode
					· {counts.wide} wideContent · {counts.fixed} fixedHeight
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Layout flags read from <code>staticData</code>. <code>appnav</code>{' '}
					and <code>contextMenu</code> are returned from <code>beforeLoad</code>{' '}
					and therefore not introspectable here — see the source.
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
							<Th center>focusMode</Th>
							<Th center>wideContent</Th>
							<Th center>fixedHeight</Th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr
								key={r.id}
								className="hover:bg-1-mlo-primary/40 border-b"
								data-name="admin-route-row"
								data-key={r.id}
							>
								<td className="py-1.5 pr-4 font-mono text-xs">{r.id}</td>
								<Cell on={r.isLazy} />
								<Cell on={r.focusMode} />
								<Cell on={r.wideContent} />
								<Cell on={r.fixedHeight} />
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

function Cell({ on }: { on: boolean }) {
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
