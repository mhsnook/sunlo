import { useRef } from 'react'
import { useAgent } from 'agents/react'
import { z } from 'zod'
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
	Library,
	Shield,
	Sprout,
	Star,
	type LucideIcon,
} from 'lucide-react'
import {
	CommonKnowledgeSchema,
	CrewMessageSchema,
	EnterpriseSchema,
	RoomSnapshotSchema,
	SitrepLineSchema,
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
	library: Library,
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

// The Enterprise thread and the charter. The live socket keeps it current.
export const enterpriseQuery = () =>
	queryOptions({
		queryKey: ['crew', 'enterprise'],
		queryFn: async () =>
			EnterpriseSchema.parse(await adminFetch('crew/enterprise')),
		staleTime: Infinity,
	})

// Where each vertical stands. The live socket keeps it current.
export const sitrepQuery = () =>
	queryOptions({
		queryKey: ['crew', 'sitrep'],
		queryFn: async () =>
			z.array(SitrepLineSchema).parse(await adminFetch('crew/sitrep')),
		staleTime: Infinity,
	})

export function useSetSitrep() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { agent: CrewKey; track: string; text: string }) =>
			adminFetch(
				`crew/sitrep/${input.agent}/${encodeURIComponent(input.track)}`,
				{ method: 'PUT', json: { text: input.text } }
			),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: sitrepQuery().queryKey }),
	})
}

// What every agent knows about the admin. The live socket keeps it current.
export const commonKnowledgeQuery = () =>
	queryOptions({
		queryKey: ['crew', 'knowledge'],
		queryFn: async () =>
			z.array(CommonKnowledgeSchema).parse(await adminFetch('crew/knowledge')),
		staleTime: Infinity,
	})

// The socket tells other tabs; this tab refetches itself, since the socket
// may not be connected yet.
export function useAddCommonKnowledge() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (text: string) =>
			adminFetch('crew/knowledge', { method: 'POST', json: { text } }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: commonKnowledgeQuery().queryKey,
			}),
	})
}

export function useForgetCommonKnowledge() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			adminFetch(`crew/knowledge/${id}`, { method: 'DELETE' }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: commonKnowledgeQuery().queryKey,
			}),
	})
}

export function useEditCommonKnowledge() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: number; text: string }) =>
			adminFetch(`crew/knowledge/${input.id}`, {
				method: 'PATCH',
				json: { text: input.text },
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: commonKnowledgeQuery().queryKey,
			}),
	})
}

export function useEditMemory(agent: CrewKey) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { id: number; text: string }) =>
			adminFetch(`crew/agents/${agent}/memory/${input.id}`, {
				method: 'PATCH',
				json: { text: input.text },
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: workspaceQuery(agent).queryKey,
			}),
	})
}

export function useForgetMemory(agent: CrewKey) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			adminFetch(`crew/agents/${agent}/memory/${id}`, { method: 'DELETE' }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: workspaceQuery(agent).queryKey,
			}),
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

const upsert = (messages: Array<CrewMessageType>, message: CrewMessageType) => {
	const index = messages.findIndex((m) => m.id === message.id)
	return index === -1 ? [...messages, message] : messages.with(index, message)
}

// Into whichever timeline the message belongs to.
function upsertMessage(queryClient: QueryClient, message: CrewMessageType) {
	if (message.place === 'bridge') {
		queryClient.setQueryData(enterpriseQuery().queryKey, (thread) =>
			thread
				? { ...thread, messages: upsert(thread.messages, message) }
				: thread
		)
	} else if (message.place === 'room') {
		queryClient.setQueryData(roomQuery().queryKey, (room) =>
			room ? { ...room, messages: upsert(room.messages, message) } : room
		)
	}
}

export function usePostToRoom() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: { body: string; routing: RoutingType | null }) =>
			CrewMessageSchema.parse(
				await adminFetch('crew/messages', {
					method: 'POST',
					json: input,
				})
			),
		onSuccess: (message) => upsertMessage(queryClient, message),
	})
}

export function usePostToEnterprise() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (body: string) =>
			CrewMessageSchema.parse(
				await adminFetch('crew/enterprise/messages', {
					method: 'POST',
					json: { body },
				})
			),
		onSuccess: (message) => upsertMessage(queryClient, message),
	})
}

export function useStartMeeting() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async () =>
			CrewMessageSchema.parse(
				await adminFetch('crew/enterprise/meeting', { method: 'POST' })
			),
		onSuccess: (message) => {
			upsertMessage(queryClient, message)
			queryClient.setQueryData(enterpriseQuery().queryKey, (thread) =>
				thread ? { ...thread, meetingStartedAt: message.at } : thread
			)
		},
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
// count. On arrival it must not: the page reads the old value to draw its
// "New since" line.
export async function markSeen(
	queryClient: QueryClient,
	place: 'room' | 'bridge',
	leaving: boolean
) {
	try {
		await adminFetch('crew/seen', { method: 'POST', json: { place } })
	} catch (error) {
		console.error('Could not mark this timeline seen', error)
		return
	}
	if (!leaving) return
	const seenAt = new Date().toISOString()
	if (place === 'room') {
		queryClient.setQueryData(roomQuery().queryKey, (room) =>
			room ? { ...room, seenAt } : room
		)
	} else {
		queryClient.setQueryData(enterpriseQuery().queryKey, (thread) =>
			thread ? { ...thread, seenAt } : thread
		)
	}
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
					enterpriseQuery().queryKey,
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
			if (event.type === 'common-knowledge') {
				void queryClient.invalidateQueries({
					queryKey: commonKnowledgeQuery().queryKey,
				})
			}
			if (event.type === 'sitrep') {
				void queryClient.invalidateQueries({
					queryKey: sitrepQuery().queryKey,
				})
			}
			if (event.type === 'enterprise') {
				void queryClient.invalidateQueries({
					queryKey: enterpriseQuery().queryKey,
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
