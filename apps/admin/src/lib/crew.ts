import { useEffect } from 'react'
import {
	queryOptions,
	useMutation,
	useQueryClient,
	type QueryClient,
} from '@tanstack/react-query'
import {
	Activity,
	Compass,
	Languages,
	MessageSquareQuote,
	Shield,
	Sprout,
	type LucideIcon,
} from 'lucide-react'
import {
	CrewMessageSchema,
	RoomSnapshotSchema,
	RoutingSchema,
	WorkspaceSchema,
	type CrewKey,
	type CrewMessageType,
	type RoomEvent,
	type RoomSnapshotType,
	type RoutingType,
} from '../../shared/crew'
import { adminFetch } from './api'

export const crewIcons: Record<CrewKey, LucideIcon> = {
	monitor: Activity,
	moderator: Shield,
	product: Compass,
	languages: Languages,
	curator: MessageSquareQuote,
	growth: Sprout,
}

export const roomQuery = () =>
	queryOptions({
		queryKey: ['crew', 'room'],
		queryFn: async () =>
			RoomSnapshotSchema.parse(await adminFetch('crew/room')),
		// The live socket keeps this current.
		staleTime: Infinity,
	})

export const workspaceQuery = (agent: CrewKey) =>
	queryOptions({
		queryKey: ['crew', 'workspace', agent],
		queryFn: async () =>
			WorkspaceSchema.parse(await adminFetch(`crew/agents/${agent}`)),
		staleTime: Infinity,
	})

export const clefQuery = (text: string) =>
	queryOptions({
		queryKey: ['crew', 'clef', text],
		queryFn: async () =>
			RoutingSchema.parse(
				await adminFetch('crew/clef', {
					method: 'POST',
					body: JSON.stringify({ text }),
				})
			),
		staleTime: Infinity,
		retry: false,
	})

function upsertMessage(queryClient: QueryClient, message: CrewMessageType) {
	queryClient.setQueryData<RoomSnapshotType>(['crew', 'room'], (room) => {
		if (!room) return room
		const index = room.messages.findIndex((m) => m.id === message.id)
		const messages =
			index === -1
				? [...room.messages, message]
				: room.messages.with(index, message)
		return { ...room, messages }
	})
}

export function usePostToRoom() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: {
			body: string
			routing: RoutingType | null
			predicted: RoutingType | null
		}) =>
			CrewMessageSchema.parse(
				await adminFetch('crew/messages', {
					method: 'POST',
					body: JSON.stringify(input),
				})
			),
		onSuccess: (message) => upsertMessage(queryClient, message),
	})
}

export function useAnswerCard() {
	return useMutation({
		mutationFn: (input: { messageId: string; actionId: string }) =>
			adminFetch(`crew/messages/${input.messageId}/answer`, {
				method: 'POST',
				body: JSON.stringify({ actionId: input.actionId }),
			}),
	})
}

// On leaving, the cached seenAt moves too, which clears the sidebar's unread
// count. On arrival it must not: the room page reads the old value to draw
// its "New since" line.
export function markRoomSeen(queryClient: QueryClient, leaving: boolean) {
	void adminFetch('crew/seen', { method: 'POST' }).then(() => {
		if (!leaving) return
		queryClient.setQueryData<RoomSnapshotType>(['crew', 'room'], (room) =>
			room ? { ...room, seenAt: new Date().toISOString() } : room
		)
	})
}

// Follows the crew room over its WebSocket for as long as the admin layout
// is mounted, and reconnects with a growing delay when the socket drops.
export function useCrewLive() {
	const queryClient = useQueryClient()
	useEffect(() => {
		let socket: WebSocket | null = null
		let ping: ReturnType<typeof setInterval> | undefined
		let retry: ReturnType<typeof setTimeout> | undefined
		let attempts = 0
		let stopped = false

		const onEvent = (event: RoomEvent) => {
			if (event.type === 'message') upsertMessage(queryClient, event.message)
			if (event.type === 'status') {
				queryClient.setQueryData<RoomSnapshotType>(['crew', 'room'], (room) =>
					room
						? {
								...room,
								statuses: { ...room.statuses, [event.agent]: event.status },
							}
						: room
				)
			}
			if (event.type === 'workspace' || event.type === 'status') {
				void queryClient.invalidateQueries({
					queryKey: ['crew', 'workspace', event.agent],
				})
			}
		}

		const connect = async () => {
			try {
				const { ticket } = (await adminFetch('crew/ticket', {
					method: 'POST',
				})) as { ticket: string }
				if (stopped) return
				const url = new URL('/api/crew/live', location.href)
				url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
				url.searchParams.set('ticket', ticket)
				socket = new WebSocket(url)
				socket.addEventListener('open', () => {
					// Anything posted while the socket was down arrives in a
					// fresh snapshot.
					if (attempts > 0) {
						void queryClient.invalidateQueries({ queryKey: ['crew'] })
					}
					attempts = 0
					ping = setInterval(() => socket?.send('ping'), 30_000)
				})
				socket.addEventListener('message', ({ data }) => {
					if (data === 'pong') return
					onEvent(JSON.parse(String(data)) as RoomEvent)
				})
				socket.addEventListener('close', () => {
					clearInterval(ping)
					scheduleRetry()
				})
			} catch {
				scheduleRetry()
			}
		}

		const scheduleRetry = () => {
			if (stopped) return
			attempts += 1
			retry = setTimeout(
				() => void connect(),
				Math.min(30_000, 1000 * 2 ** attempts)
			)
		}

		void connect()
		return () => {
			stopped = true
			clearTimeout(retry)
			clearInterval(ping)
			socket?.close()
		}
	}, [queryClient])
}

// An agent counts as working only for a while: a run that crashed without
// reporting back should not show "working" forever.
export const isWorking = (
	status: { state: string; since: string } | undefined
) =>
	status?.state === 'working' &&
	Date.now() - Date.parse(status.since) < 15 * 60_000
