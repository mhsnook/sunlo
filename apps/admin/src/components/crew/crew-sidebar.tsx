import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouteContext, useRouterState } from '@tanstack/react-router'
import { BarChart3, LogOut, Menu } from 'lucide-react'
import supabase from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import {
	adminAuthor,
	crewList,
	vessels,
	type CrewKey,
	type VesselKey,
} from '../../../shared/crew'
import { isWorking, roomQuery } from '~/lib/crew'
import { AdminAvatar, AgentAvatar } from './crew-parts'
import { shortWhen } from '~/lib/format'

const vesselKeys = Object.keys(vessels) as Array<VesselKey>

export function CrewSidebar({ onNavigate }: { onNavigate?: () => void }) {
	const { session } = useRouteContext({ from: '/_admin' })
	const email = session.user.email ?? ''
	const myAuthor = adminAuthor(session.user.id)
	const { data: room } = useQuery(roomQuery())
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	const messages = room?.messages ?? []
	const last = messages.at(-1)
	const unread =
		pathname === '/' || !room?.seenAt
			? 0
			: messages.filter((m) => m.at > room.seenAt! && m.author !== myAuthor)
					.length

	return (
		<nav aria-label="The crew" className="flex h-full flex-col">
			<div className="px-5 py-4 font-semibold">Sunlo admin</div>
			<ul className="flex-1 space-y-1 overflow-y-auto px-2">
				<SidebarItem
					avatar={<AgentAvatar agent="crew" />}
					name="The crew"
					preview={
						last
							? `${last.author === myAuthor ? 'You' : last.authorName}: ${last.body}`
							: 'Nobody has said anything yet'
					}
					when={last?.at}
					count={unread}
					target="crew"
					onNavigate={onNavigate}
				/>
				<SidebarItem
					avatar={<AgentAvatar agent="stack" />}
					name="Brought to you"
					preview={
						room?.stackCount ? 'From Riker and Data' : 'Nothing waiting on you'
					}
					count={room?.stackCount ?? 0}
					target="stack"
					onNavigate={onNavigate}
				/>
				{vesselKeys.map((vessel) => (
					<li key={vessel} className="list-none">
						<p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-semibold">
							{vessels[vessel].name}
							<span className="font-normal"> · {vessels[vessel].note}</span>
						</p>
						<ul className="space-y-1">
							{crewList
								.filter((member) => member.vessel === vessel)
								.map((member) => {
									const own = messages.filter((m) => m.author === member.key)
									const latest = own.at(-1)
									const waiting = own.filter((m) => m.card && !m.answer).length
									const working = isWorking(room?.statuses[member.key])
									return (
										<SidebarItem
											key={member.key}
											avatar={<AgentAvatar agent={member.key} />}
											name={member.name}
											preview={
												!member.active
													? 'Not started yet'
													: working
														? 'Working…'
														: (latest?.body ?? member.title)
											}
											when={latest?.at}
											count={waiting}
											dim={!member.active}
											target={member.key}
											onNavigate={onNavigate}
										/>
									)
								})}
						</ul>
					</li>
				))}
			</ul>
			<div className="flex items-center gap-2 border-t px-4 py-3 text-sm">
				<AdminAvatar name={email} />
				<span className="text-muted-foreground min-w-0 flex-1 truncate">
					{email}
				</span>
				<Link
					to="/activity"
					onClick={onNavigate}
					className="text-muted-foreground hover:text-foreground flex items-center gap-1"
				>
					<BarChart3 className="size-4" /> Activity
				</Link>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Sign out"
					onClick={() => void supabase.auth.signOut()}
				>
					<LogOut />
				</Button>
			</div>
		</nav>
	)
}

function SidebarItem({
	avatar,
	name,
	preview,
	when,
	count,
	dim = false,
	target,
	onNavigate,
}: {
	avatar: ReactNode
	name: string
	preview: string
	when?: string
	count: number
	dim?: boolean
	target: CrewKey | 'crew' | 'stack'
	onNavigate?: () => void
}) {
	return (
		<li>
			<Link
				{...(target === 'crew'
					? { to: '/' as const }
					: target === 'stack'
						? { to: '/stack' as const }
						: { to: '/crew/$agent' as const, params: { agent: target } })}
				onClick={onNavigate}
				data-testid="crew-sidebar-item"
				data-key={target}
				activeOptions={{ exact: true, includeSearch: false }}
				className="hover:bg-primary-100 data-[status=active]:bg-primary-200 flex items-center gap-3 rounded-2xl px-3 py-2"
			>
				{avatar}
				<span className="min-w-0 flex-1">
					<span className="flex items-baseline justify-between gap-2">
						<span className="truncate font-semibold">{name}</span>
						{when && (
							<span className="text-muted-foreground shrink-0 text-xs">
								{shortWhen(when)}
							</span>
						)}
					</span>
					<span className="flex items-center justify-between gap-2">
						<span
							className={cn(
								'text-muted-foreground truncate text-sm',
								dim && 'italic'
							)}
						>
							{preview.replaceAll('**', '').replace(/\s+/g, ' ')}
						</span>
						{count > 0 && (
							<span className="bg-primary-700 text-paper shrink-0 rounded-full px-1.5 text-xs font-semibold">
								{count}
							</span>
						)}
					</span>
				</span>
			</Link>
		</li>
	)
}

// The sidebar folds away below the md breakpoint; page headers show this
// button instead.
export function MobileSidebarButton() {
	const [open, setOpen] = useState(false)
	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Open the crew list"
						className="md:hidden"
					/>
				}
			>
				<Menu />
			</SheetTrigger>
			<SheetContent side="left" className="bg-primary-50 w-80 p-0">
				<SheetTitle className="sr-only">The crew</SheetTitle>
				<CrewSidebar onNavigate={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	)
}
