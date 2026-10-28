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
	crew,
	displayName,
	principalOf,
	roomKeys,
	roomMembers,
	roomNames,
	type CrewMessageType,
	type RoomKey,
} from '../../../shared/crew'
import { isNewFor, isWorking, roomQuery, threadQuery } from '~/lib/crew'
import { AdminAvatar, AgentAvatar, RoomAvatar } from './crew-parts'
import { shortWhen } from '~/lib/format'

// Zero until the admin first opens the timeline: a room they have never
// read shows no count, however much is in it.
const unreadCount = (
	messages: Array<CrewMessageType>,
	seenAt: string | null,
	myAuthor: string
) => messages.filter((m) => isNewFor(m, seenAt, myAuthor)).length

const previewOf = (message: CrewMessageType, myAuthor: string) =>
	`${message.author === myAuthor ? 'You' : message.authorName}: ${message.card?.title ?? message.body}`

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

	return (
		<nav aria-label="The crew" className="flex h-full flex-col">
			<div className="px-5 py-4 font-semibold">Sunlo admin</div>
			<ul className="flex-1 space-y-1 overflow-y-auto px-2">
				<SidebarItem
					avatar={<AgentAvatar agent="crew" />}
					name="Common Room"
					preview={
						last ? previewOf(last, myAuthor) : 'Nobody has said anything yet'
					}
					when={last?.at}
					unread={
						pathname === '/'
							? 0
							: unreadCount(messages, room?.seenAt ?? null, myAuthor)
					}
					target="crew"
					onNavigate={onNavigate}
				/>
				{roomKeys.map((room) => (
					<SubjectRoomItem
						key={room}
						room={room}
						here={pathname === `/room/${room}`}
						myAuthor={myAuthor}
						onNavigate={onNavigate}
					/>
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

function SubjectRoomItem({
	room,
	here,
	myAuthor,
	onNavigate,
}: {
	room: RoomKey
	here: boolean
	myAuthor: string
	onNavigate?: () => void
}) {
	const { data: crewRoom } = useQuery(roomQuery())
	const { data: thread } = useQuery(threadQuery(room))
	const last = thread?.messages.at(-1)
	const members = roomMembers(room)
	const principal = principalOf(room)
	const working = members.filter((key) => isWorking(crewRoom?.statuses[key]))
	const active = crew[principal].active
	return (
		<SidebarItem
			avatar={<RoomAvatar room={room} />}
			name={roomNames[room]}
			preview={
				working.length
					? `${working.map(displayName).join(' and ')} working…`
					: last
						? previewOf(last, myAuthor)
						: active
							? members.map(displayName).join(' and ')
							: `${displayName(principal)} has not started yet`
			}
			when={last?.at}
			unread={
				here || !thread
					? 0
					: unreadCount(thread.messages, thread.seenAt, myAuthor)
			}
			cards={crewRoom?.openCards?.[room] ?? 0}
			dim={!active}
			target={room}
			onNavigate={onNavigate}
		/>
	)
}

function SidebarItem({
	avatar,
	name,
	preview,
	when,
	unread,
	cards = 0,
	dim = false,
	target,
	onNavigate,
}: {
	avatar: ReactNode
	name: string
	preview: string
	when?: string
	unread: number
	// Cards that wait on the admin.
	cards?: number
	dim?: boolean
	target: RoomKey | 'crew'
	onNavigate?: () => void
}) {
	return (
		<li>
			<Link
				{...(target === 'crew'
					? { to: '/' as const }
					: { to: '/room/$room' as const, params: { room: target } })}
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
						<span className="flex shrink-0 gap-1">
							{cards > 0 && (
								<span
									className="border-primary-700 text-primary-800 rounded-full border px-1.5 text-xs font-semibold"
									title={`${cards} ${cards === 1 ? 'card waits' : 'cards wait'} on you`}
									data-testid="crew-sidebar-cards"
								>
									{cards}
								</span>
							)}
							{unread > 0 && (
								<span
									className="bg-primary-700 text-paper rounded-full px-1.5 text-xs font-semibold"
									title={`${unread} unread`}
									data-testid="crew-sidebar-unread"
								>
									{unread}
								</span>
							)}
						</span>
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
