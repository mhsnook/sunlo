import { useRef } from 'react'
import { useAgent } from 'agents/react'
import { z } from 'zod'
import {
	queryOptions,
	useMutation,
	useQueryClient,
	type QueryClient,
} from '@tanstack/react-query'
import {
	Compass,
	Cpu,
	GraduationCap,
	Languages,
	Library,
	Martini,
	Rocket,
	Star,
	Wrench,
	type LucideIcon,
} from 'lucide-react'
import {
	CommandSchema,
	CommonKnowledgeSchema,
	CrewMessageSchema,
	DocumentSchema,
	DocumentSummarySchema,
	RevisionTextSchema,
	roomOfPlace,
	RoomSnapshotSchema,
	RoomThreadSchema,
	WorkspaceSchema,
	type CrewKey,
	type CrewMessageType,
	type DocumentSummaryType,
	type GithubDraftType,
	type RoomKey,
	type PlaceType,
	type RoomEvent,
	type RoomStateType,
	type RoutingType,
} from '../../shared/crew'
import { adminFetch } from './api'
import { accessToken } from './session'

export const crewIcons: Record<CrewKey, LucideIcon> = {
	'command-1': Star,
	'command-2': Cpu,
	'product-1': Wrench,
	'library-1': Languages,
	'learnership-1': Martini,
}

export const roomIcons: Record<RoomKey, LucideIcon> = {
	command: Rocket,
	product: Compass,
	library: Library,
	learnership: GraduationCap,
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

// One subject's room. The live socket keeps it current.
export const threadQuery = (room: RoomKey) =>
	queryOptions({
		queryKey: ['crew', 'thread', room],
		queryFn: async () =>
			RoomThreadSchema.parse(await adminFetch(`crew/rooms/${room}`)),
		staleTime: Infinity,
	})

// The Command room's charter and weekly meeting. The live socket keeps it
// current.
export const commandQuery = () =>
	queryOptions({
		queryKey: ['crew', 'command'],
		queryFn: async () => CommandSchema.parse(await adminFetch('crew/command')),
		staleTime: Infinity,
	})

// A room's documents, without their text. The live socket keeps this and
// the two document queries below current.
export const documentsQuery = (room: RoomKey) =>
	queryOptions({
		queryKey: ['crew', 'documents', room],
		queryFn: async () =>
			z
				.array(DocumentSummarySchema)
				.parse(await adminFetch(`crew/rooms/${room}/documents`)),
		staleTime: Infinity,
	})

export const documentQuery = (id: number) =>
	queryOptions({
		queryKey: ['crew', 'document', id],
		queryFn: async () =>
			DocumentSchema.parse(await adminFetch(`crew/documents/${id}`)),
		staleTime: Infinity,
	})

// A saved revision never changes.
export const revisionQuery = (id: number, revision: number) =>
	queryOptions({
		queryKey: ['crew', 'revision', id, revision],
		queryFn: async () =>
			RevisionTextSchema.parse(
				await adminFetch(`crew/documents/${id}/revisions/${revision}`)
			),
		staleTime: Infinity,
	})

// Refused with the server's message when the document has a newer revision
// than `baseRevision`.
export function useSaveDocument(document: DocumentSummaryType) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (
			input:
				| { text: string; summary: string; baseRevision: number }
				| { restores: number; baseRevision: number }
		) =>
			adminFetch(`crew/documents/${document.id}`, {
				method: 'PUT',
				json: input,
			}),
		onSuccess: () => documentChanged(queryClient, document),
	})
}

const documentChanged = (
	queryClient: QueryClient,
	document: { room: RoomKey; id: number }
) =>
	Promise.all([
		queryClient.invalidateQueries({
			queryKey: documentsQuery(document.room).queryKey,
		}),
		queryClient.invalidateQueries({
			queryKey: documentQuery(document.id).queryKey,
		}),
	])

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

const upsert = (messages: Array<CrewMessageType>, message: CrewMessageType) => {
	const index = messages.findIndex((m) => m.id === message.id)
	return index === -1 ? [...messages, message] : messages.with(index, message)
}

type Timeline = { messages: Array<CrewMessageType>; seenAt: string | null }

// Changes the cached timeline a place belongs to, if it is cached.
function updateTimeline(
	queryClient: QueryClient,
	place: PlaceType,
	change: (timeline: Timeline) => Partial<Timeline>
) {
	const room = roomOfPlace(place)
	if (room) {
		queryClient.setQueryData(threadQuery(room).queryKey, (thread) =>
			thread ? { ...thread, ...change(thread) } : thread
		)
	} else {
		queryClient.setQueryData(roomQuery().queryKey, (common) =>
			common ? { ...common, ...change(common) } : common
		)
	}
}

const upsertMessage = (queryClient: QueryClient, message: CrewMessageType) =>
	updateTimeline(queryClient, message.place, (timeline) => ({
		messages: upsert(timeline.messages, message),
	}))

// A message someone else wrote after the admin last opened its timeline.
export const isNewFor = (
	message: CrewMessageType,
	seenAt: string | null,
	myAuthor: string
) => !!seenAt && message.at > seenAt && message.author !== myAuthor

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

export function usePostToThread(room: RoomKey) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (body: string) =>
			CrewMessageSchema.parse(
				await adminFetch(`crew/rooms/${room}/messages`, {
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
				await adminFetch('crew/meeting', { method: 'POST' })
			),
		onSuccess: (message) => {
			upsertMessage(queryClient, message)
			queryClient.setQueryData(commandQuery().queryKey, (command) =>
				command ? { ...command, meetingStartedAt: message.at } : command
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

// Files a "github" card's draft, as the admin edited it. The socket brings
// the answered card back.
export function useFileDraft() {
	return useMutation({
		mutationFn: async (input: { messageId: string; draft: GithubDraftType }) =>
			z.object({ url: z.string() }).parse(
				await adminFetch(`crew/messages/${input.messageId}/file`, {
					method: 'POST',
					json: { draft: input.draft },
				})
			),
	})
}

export function useAnswerCard() {
	return useMutation({
		mutationFn: (input: {
			messageId: string
			actionId: string
			feedback?: string
		}) =>
			adminFetch(`crew/messages/${input.messageId}/answer`, {
				method: 'POST',
				json: { actionId: input.actionId, feedback: input.feedback },
			}),
	})
}

// On leaving, the cached seenAt moves too, which clears the sidebar's unread
// count. On arrival it must not: the page reads the old value to draw its
// "New since" line.
export async function markSeen(
	queryClient: QueryClient,
	place: PlaceType,
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
	updateTimeline(queryClient, place, () => ({ seenAt }))
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
					['crew', 'thread'],
					commandQuery().queryKey,
					['crew', 'workspace'],
					['crew', 'documents'],
					['crew', 'document'],
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
			if (event.type === 'document') void documentChanged(queryClient, event)
			if (event.type === 'command') {
				void queryClient.invalidateQueries({
					queryKey: commandQuery().queryKey,
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
