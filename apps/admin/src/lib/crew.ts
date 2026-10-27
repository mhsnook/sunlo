import { useRef } from 'react'
import { useAgent } from 'agents/react'
import { createFlueClient } from '@flue/sdk'
import {
	queryOptions,
	useMutation,
	useQueryClient,
	type QueryClient,
} from '@tanstack/react-query'
import {
	Activity,
	Compass,
	Cpu,
	Languages,
	MessageSquareQuote,
	Shield,
	Sprout,
	Star,
	type LucideIcon,
} from 'lucide-react'
import {
	CrewMessageSchema,
	RoomSnapshotSchema,
	RoutingSchema,
	StackSchema,
	WorkspaceSchema,
	type CrewKey,
	type CrewMessageType,
	type RoomEvent,
	type RoomStateType,
	type RoutingType,
} from '../../shared/crew'
import { adminFetch } from './api'
import { accessToken } from './session'

export const crewIcons: Record<CrewKey, LucideIcon> = {
	riker: Star,
	data: Cpu,
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

export const stackQuery = () =>
	queryOptions({
		queryKey: ['crew', 'stack'],
		queryFn: async () => StackSchema.parse(await adminFetch('crew/stack')),
		staleTime: Infinity,
	})

export function useAnswerStack() {
	return useMutation({
		mutationFn: (input: {
			id: number
			actionId: string
			note: string | null
		}) =>
			adminFetch(`crew/stack/${input.id}/answer`, {
				method: 'POST',
				json: { actionId: input.actionId, note: input.note },
			}),
	})
}

export function useForgetMemory(agent: CrewKey) {
	return useMutation({
		mutationFn: (id: number) =>
			adminFetch(`crew/agents/${agent}/memory/${id}`, { method: 'DELETE' }),
	})
}

export function useEditCharter() {
	return useMutation({
		mutationFn: (input: {
			id: number
			text?: string
			status?: 'kept' | 'dropped'
		}) =>
			adminFetch(`crew/charter/${input.id}`, {
				method: 'PATCH',
				json: { text: input.text, status: input.status },
			}),
	})
}

export function useSetTimezone() {
	return useMutation({
		mutationFn: (timezone: string) =>
			adminFetch('crew/weekly/timezone', {
				method: 'PUT',
				json: { timezone },
			}),
	})
}

// The client for one admin's 1:1 conversation with an agent.
export const dmClient = (agent: CrewKey, uid: string) =>
	createFlueClient({
		url: `/api/agents/${agent}/dm-${uid}`,
		// Called per request, so a refreshed Supabase token is picked up.
		headers: async () => ({ authorization: `Bearer ${await accessToken()}` }),
	})

export const clefQuery = (text: string) =>
	queryOptions({
		queryKey: ['crew', 'clef', text],
		queryFn: async () =>
			RoutingSchema.parse(
				await adminFetch('crew/clef', {
					method: 'POST',
					json: { text },
				})
			),
		staleTime: Infinity,
		retry: false,
	})

function upsertMessage(queryClient: QueryClient, message: CrewMessageType) {
	queryClient.setQueryData(roomQuery().queryKey, (room) => {
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
					json: input,
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
					json: { routing: input.routing },
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
				json: { actionId: input.actionId },
			}),
	})
}

// On leaving, the cached seenAt moves too, which clears the sidebar's unread
// count. On arrival it must not: the room page reads the old value to draw
// its "New since" line.
export function markRoomSeen(queryClient: QueryClient, leaving: boolean) {
	void adminFetch('crew/seen', { method: 'POST' }).then(() => {
		if (!leaving) return
		queryClient.setQueryData(roomQuery().queryKey, (room) =>
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
		query: async () => ({ token: await accessToken() }),
		// Shorter than the Supabase token's hour, so a reconnect gets a live one.
		cacheTtl: 60_000,
		onOpen: () => {
			// Anything posted while the socket was down arrives in a fresh
			// snapshot.
			if (opened.current) {
				for (const queryKey of [
					roomQuery().queryKey,
					stackQuery().queryKey,
					['crew', 'workspace'],
				]) {
					void queryClient.invalidateQueries({ queryKey })
				}
			}
			opened.current = true
		},
		onStateUpdate: (state) => {
			queryClient.setQueryData(roomQuery().queryKey, (room) =>
				room ? { ...room, ...state } : room
			)
		},
		onMessage: ({ data }: MessageEvent) => {
			const event = JSON.parse(String(data)) as RoomEvent
			if (event.type === 'message') upsertMessage(queryClient, event.message)
			if (event.type === 'stack') {
				void queryClient.invalidateQueries({
					queryKey: stackQuery().queryKey,
				})
			}
			if (event.type === 'workspace') {
				void queryClient.invalidateQueries({
					queryKey: workspaceQuery(event.agent).queryKey,
				})
			}
		},
	})
}

export const isWorking = (status: { state: string } | undefined) =>
	status?.state === 'working'
