import { useRef } from 'react'
import { useAgent } from 'agents/react'
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
	type RoomStateType,
	type RoutingType,
} from '../../shared/crew'
import { adminFetch } from './api'
import { getSession } from './session'

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

export function useCorrectRouting() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: { messageId: string; routing: RoutingType }) =>
			CrewMessageSchema.parse(
				await adminFetch(`crew/messages/${input.messageId}/correct`, {
					method: 'POST',
					body: JSON.stringify({ routing: input.routing }),
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

// Follows the crew room for as long as the admin layout is mounted.
// useAgent owns the socket and reconnects it; the room's synced state
// carries agent statuses, and its messages carry room events.
export function useCrewLive() {
	const queryClient = useQueryClient()
	const opened = useRef(false)
	useAgent<RoomStateType>({
		agent: 'crew-room',
		basePath: 'api/crew/live',
		query: async () => ({ token: (await getSession())?.access_token ?? null }),
		// Shorter than the Supabase token's hour, so a reconnect gets a live one.
		cacheTtl: 60_000,
		onOpen: () => {
			// Anything posted while the socket was down arrives in a fresh
			// snapshot.
			if (opened.current) {
				void queryClient.invalidateQueries({ queryKey: ['crew'] })
			}
			opened.current = true
		},
		onStateUpdate: (state) => {
			queryClient.setQueryData<RoomSnapshotType>(['crew', 'room'], (room) =>
				room ? { ...room, statuses: state.statuses } : room
			)
		},
		onMessage: ({ data }: MessageEvent) => {
			const event = JSON.parse(String(data)) as RoomEvent
			if (event.type === 'message') upsertMessage(queryClient, event.message)
			if (event.type === 'workspace') {
				void queryClient.invalidateQueries({
					queryKey: ['crew', 'workspace', event.agent],
				})
			}
		},
	})
}

// An agent counts as working only for a while: a run that crashed without
// reporting back should not show "working" forever.
export const isWorking = (
	status: { state: string; since: string } | undefined
) =>
	status?.state === 'working' &&
	Date.now() - Date.parse(status.since) < 15 * 60_000
