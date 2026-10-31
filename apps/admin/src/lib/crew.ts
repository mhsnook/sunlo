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
	Palette,
	Rocket,
	Star,
	Wrench,
	type LucideIcon,
} from 'lucide-react'
import {
	CharterEntrySchema,
	COMMON_ROOM,
	CommandSchema,
	CommonKnowledgeSchema,
	CrewMessageSchema,
	DocumentSchema,
	DocumentSummarySchema,
	MessageImageSchema,
	PainterStyleSchema,
	placeOf,
	RevisionTextSchema,
	roomOfPlace,
	isThreadPlace,
	RoomSnapshotSchema,
	RoomThreadSchema,
	RunSchema,
	WorkspaceSchema,
	type CrewKey,
	type CrewMessageType,
	type DocumentSummaryType,
	type GithubDraftType,
	type MessageImageType,
	type PainterStyleInputType,
	type PickChoice,
	type CharterEntryType,
	type RoomKey,
	type PlaceType,
	type RoomEvent,
	type RoomStateType,
	type RoutingType,
	type RunType,
} from '../../shared/crew'
import { adminFetch, adminRequest } from './api'
import { uploadOnce } from './images'
import { accessToken } from './session'

export const crewIcons: Record<CrewKey, LucideIcon> = {
	'command-1': Star,
	'command-2': Cpu,
	'product-1': Wrench,
	'product-2': Palette,
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

// The steps of each agent's last few runs. The live socket keeps them
// current.
export const runsQuery = () =>
	queryOptions({
		queryKey: ['crew', 'runs'],
		queryFn: async () =>
			z.array(RunSchema).parse(await adminFetch('crew/runs')),
		staleTime: Infinity,
	})

const upsertRun = (runs: Array<RunType>, run: RunType) => {
	const index = runs.findIndex((r) => r.id === run.id)
	return index === -1 ? [...runs, run] : runs.with(index, run)
}

// One subject's room. The live socket keeps it current.
export const threadQuery = (room: RoomKey) =>
	queryOptions({
		queryKey: ['crew', 'thread', room],
		queryFn: async () =>
			RoomThreadSchema.parse(await adminFetch(`crew/rooms/${room}`)),
		staleTime: Infinity,
	})

// The Command room's weekly meeting. The live socket keeps it current.
export const commandQuery = () =>
	queryOptions({
		queryKey: ['crew', 'command'],
		queryFn: async () => CommandSchema.parse(await adminFetch('crew/command')),
		staleTime: Infinity,
	})

// What a room knows about the admin. The live socket keeps it current.
export const charterQuery = (room: RoomKey) =>
	queryOptions({
		queryKey: ['crew', 'charter', room],
		queryFn: async () =>
			z
				.array(CharterEntrySchema)
				.parse(await adminFetch(`crew/rooms/${room}/charter`)),
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

// A sketch never changes. Its picture comes as a blob, because the request
// needs the admin's token, which an <img src> cannot send.
export const sketchQuery = (id: number) =>
	queryOptions({
		queryKey: ['crew', 'sketch', id],
		queryFn: async () =>
			SketchSourceSchema.parse(await adminFetch(`crew/sketches/${id}`)),
		staleTime: Infinity,
	})

export const sketchImageQuery = (id: number) =>
	queryOptions({
		queryKey: ['crew', 'sketch', id, 'image'],
		queryFn: async () => {
			const blob = await (
				await adminRequest(`crew/sketches/${id}/image`)
			).blob()
			return cachedPicture(blob)
		},
		staleTime: Infinity,
	})

// An image never changes, and comes as a blob for the same reason a
// sketch's picture does.
export const imageQuery = (id: number) =>
	queryOptions({
		queryKey: ['crew', 'image', id],
		queryFn: async () => {
			const blob = await (await adminRequest(`crew/images/${id}`)).blob()
			return cachedPicture(blob)
		},
		staleTime: Infinity,
	})

// Each cached picture owns its object URL, which `revokePictureUrls`
// revokes when the cache drops the entry. Two entries never share a URL,
// even for the same blob.
const cachedPicture = (blob: Blob) => ({ blob, url: URL.createObjectURL(blob) })

const isPictureKey = (key: ReadonlyArray<unknown>) =>
	key[0] === 'crew' &&
	(key[1] === 'image' || (key[1] === 'sketch' && key[3] === 'image'))

export const revokePictureUrls = (queryClient: QueryClient) =>
	queryClient.getQueryCache().subscribe((event) => {
		if (event.type !== 'removed') return
		if (!isPictureKey(event.query.queryKey as ReadonlyArray<unknown>)) return
		const data = event.query.state.data as { url: string } | undefined
		if (data) URL.revokeObjectURL(data.url)
	})

const seedImage = (queryClient: QueryClient, id: number, blob: Blob) => {
	const { queryKey } = imageQuery(id)
	if (!queryClient.getQueryData(queryKey)) {
		queryClient.setQueryData(queryKey, cachedPicture(blob))
	}
}

// An image in the composer, scaled down and ready to upload.
export type DraftImage = {
	key: string
	blob: Blob
	url: string
	width: number
	height: number
}

const imageUploads = uploadOnce(async (blob) =>
	MessageImageSchema.parse(
		await adminFetch('crew/images', { method: 'POST', body: blob })
	)
)

// The images go up first; the message then names them by id. Each one's
// cached picture is the blob already in the browser, so the timeline does
// not download it again.
async function sendWithImages<T>(
	queryClient: QueryClient,
	images: Array<DraftImage>,
	send: (ids: Array<number>) => Promise<T>
): Promise<T> {
	const stored = await Promise.all(
		images.map(async (image) => {
			const { id } = await imageUploads.upload(image)
			seedImage(queryClient, id, image.blob)
			return id
		})
	)
	const sent = await send(stored)
	imageUploads.forget(images.map((image) => image.key))
	return sent
}

// Negative ids never reach the server: they name a pending message's
// images in the image cache until the server's message replaces it.
let nextPendingImage = -1
const pendingImages = (queryClient: QueryClient, images: Array<DraftImage>) =>
	images.map((image): MessageImageType => {
		const id = nextPendingImage--
		seedImage(queryClient, id, image.blob)
		return { id, width: image.width, height: image.height }
	})

const SketchSourceSchema = z.object({
	label: z.string(),
	idea: z.string(),
	html: z.string(),
	frame: z.enum(['phone', 'desktop']),
})

// The painter's styles. The live socket keeps this current.
export const painterStylesQuery = () =>
	queryOptions({
		queryKey: ['crew', 'painter-styles'],
		queryFn: async () =>
			z
				.array(PainterStyleSchema)
				.parse(await adminFetch('crew/painter-styles')),
		staleTime: Infinity,
	})

// Saves a new style when `id` is null. Its new example images upload first.
export function useSavePainterStyle() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: {
			id: number | null
			style: Omit<PainterStyleInputType, 'examples'>
			examples: Array<number>
			newExamples: Array<DraftImage>
		}) =>
			sendWithImages(queryClient, input.newExamples, (uploaded) => {
				const json = {
					...input.style,
					examples: [...input.examples, ...uploaded],
				}
				return input.id === null
					? adminFetch('crew/painter-styles', { method: 'POST', json })
					: adminFetch(`crew/painter-styles/${input.id}`, {
							method: 'PUT',
							json,
						})
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: painterStylesQuery().queryKey,
			}),
	})
}

export function useDeletePainterStyle() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			adminFetch(`crew/painter-styles/${id}`, { method: 'DELETE' }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: painterStylesQuery().queryKey,
			}),
	})
}

// An SVG never changes. The app shows it only through <img> from a data:
// URL, never a blob: URL: a blob: URL has the app's origin, so opening one
// in a tab would run any script the SVG held there. downloadSvg saves it.
export const svgQuery = (id: number) =>
	queryOptions({
		queryKey: ['crew', 'svg', id],
		queryFn: async () => {
			const text = await (await adminRequest(`crew/svgs/${id}`)).text()
			return {
				text,
				src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
			}
		},
		staleTime: Infinity,
	})

// Typed application/octet-stream, so the browser saves the SVG rather than
// shows it.
export function downloadSvg(text: string, fileName: string) {
	const url = URL.createObjectURL(
		new Blob([text], { type: 'application/octet-stream' })
	)
	const link = document.createElement('a')
	link.href = url
	link.download = fileName
	link.click()
	// Some browsers fail a download whose URL is revoked before it starts.
	setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

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

// A change the admin makes to one agent's workspace or character, which
// reloads that workspace once the room has it.
function useWorkspaceChange<TInput>(
	agent: CrewKey,
	send: (input: TInput) => Promise<unknown>
) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: send,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: workspaceQuery(agent).queryKey,
			}),
	})
}

export const useEditMemory = (agent: CrewKey) =>
	useWorkspaceChange(agent, (input: { id: number; text: string }) =>
		adminFetch(`crew/agents/${agent}/memory/${input.id}`, {
			method: 'PATCH',
			json: { text: input.text },
		})
	)

export const useForgetMemory = (agent: CrewKey) =>
	useWorkspaceChange(agent, (id: number) =>
		adminFetch(`crew/agents/${agent}/memory/${id}`, { method: 'DELETE' })
	)

export const useAddMemory = (agent: CrewKey) =>
	useWorkspaceChange(agent, (text: string) =>
		adminFetch(`crew/agents/${agent}/memory`, {
			method: 'POST',
			json: { text },
		})
	)

export const useSetCharacter = (agent: CrewKey) =>
	useWorkspaceChange(agent, (text: string) =>
		adminFetch(`crew/agents/${agent}/character`, {
			method: 'PUT',
			json: { text },
		})
	)

export const useRestoreCharacter = (agent: CrewKey) =>
	useWorkspaceChange(agent, () =>
		adminFetch(`crew/agents/${agent}/character`, { method: 'DELETE' })
	)

export const useAddTodo = (agent: CrewKey) =>
	useWorkspaceChange(agent, (text: string) =>
		adminFetch(`crew/agents/${agent}/todos`, {
			method: 'POST',
			json: { text },
		})
	)

export const useEditTodo = (agent: CrewKey) =>
	useWorkspaceChange(
		agent,
		(input: { id: number; text?: string; done?: boolean }) =>
			adminFetch(`crew/agents/${agent}/todos/${input.id}`, {
				method: 'PATCH',
				json: { text: input.text, done: input.done },
			})
	)

export const useDeleteTodo = (agent: CrewKey) =>
	useWorkspaceChange(agent, (id: number) =>
		adminFetch(`crew/agents/${agent}/todos/${id}`, { method: 'DELETE' })
	)

export const useEditOpenItem = (agent: CrewKey) =>
	useWorkspaceChange(agent, (input: { id: number; title: string }) =>
		adminFetch(`crew/agents/${agent}/open-items/${input.id}`, {
			method: 'PATCH',
			json: { title: input.title },
		})
	)

export const useCloseOpenItem = (agent: CrewKey) =>
	useWorkspaceChange(agent, (id: number) =>
		adminFetch(`crew/agents/${agent}/open-items/${id}`, { method: 'DELETE' })
	)

export function useAddCharter(room: RoomKey) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { kind: CharterEntryType['kind']; text: string }) =>
			adminFetch(`crew/rooms/${room}/charter`, { method: 'POST', json: input }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: charterQuery(room).queryKey }),
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

// Side-thread replies arrive as "reply" events instead.
const upsertMessage = (queryClient: QueryClient, message: CrewMessageType) => {
	if (isThreadPlace(message.place)) return
	updateTimeline(queryClient, message.place, (timeline) => ({
		messages: upsert(timeline.messages, message),
	}))
}

// A side-thread reply joins its thread in the cached room it is in.
function upsertReply(
	queryClient: QueryClient,
	place: PlaceType,
	message: CrewMessageType
) {
	const room = roomOfPlace(place)
	const root = message.parent
	if (!room || !root) return
	queryClient.setQueryData(threadQuery(room).queryKey, (thread) =>
		thread
			? {
					...thread,
					replies: {
						...thread.replies,
						[root]: upsert(thread.replies[root] ?? [], message),
					},
				}
			: thread
	)
}

const PENDING_PREFIX = 'pending:'

// The admin's message as its timeline shows it until the server answers.
export const isPendingMessage = (message: CrewMessageType) =>
	message.id.startsWith(PENDING_PREFIX)

// No routing: the timeline offers to correct a routed message, and this one
// has not been routed yet.
const pendingMessage = (
	author: string,
	place: PlaceType,
	body: string,
	images: Array<MessageImageType>
): CrewMessageType => ({
	id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
	at: new Date().toISOString(),
	author,
	authorName: 'You',
	body,
	images,
	routing: null,
	card: null,
	answer: null,
	place,
	corrected: null,
	receipt: false,
	otherViewOf: null,
	parent: null,
	thread: null,
	pick: null,
})

// A message someone else wrote after the admin last opened its timeline.
export const isNewFor = (
	message: CrewMessageType,
	seenAt: string | null,
	myAuthor: string
) => !!seenAt && message.at > seenAt && message.author !== myAuthor

// The pending message shows at once, and one cache write swaps it for the
// server's row, or drops it when the send fails. The server stores a message
// where it was posted, so the row lands in the pending message's timeline.
const postHandlers = <TInput>(
	queryClient: QueryClient,
	toPending: (input: TInput) => CrewMessageType
) => ({
	onMutate: (input: TInput) => {
		const pending = toPending(input)
		upsertMessage(queryClient, pending)
		return pending
	},
	onSettled: (
		message: CrewMessageType | undefined,
		_error: Error | null,
		_input: TInput,
		pending: CrewMessageType | undefined
	) => {
		if (!pending || isThreadPlace(pending.place)) return
		updateTimeline(queryClient, pending.place, (timeline) => {
			const rest = timeline.messages.filter((m) => m.id !== pending.id)
			return { messages: message ? upsert(rest, message) : rest }
		})
	},
})

// `myAuthor` is the admin's own author key, so the timeline draws the
// pending message as theirs.
export function usePostToRoom(myAuthor: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: {
			body: string
			images: Array<DraftImage>
			routing: RoutingType | null
		}) =>
			sendWithImages(queryClient, input.images, async (images) =>
				CrewMessageSchema.parse(
					await adminFetch('crew/messages', {
						method: 'POST',
						json: { body: input.body, images, routing: input.routing },
					})
				)
			),
		...postHandlers(queryClient, (input) =>
			pendingMessage(
				myAuthor,
				COMMON_ROOM,
				input.body,
				pendingImages(queryClient, input.images)
			)
		),
	})
}

export function usePostToThread(room: RoomKey, myAuthor: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: { body: string; images: Array<DraftImage> }) =>
			sendWithImages(queryClient, input.images, async (images) =>
				CrewMessageSchema.parse(
					await adminFetch(`crew/rooms/${room}/messages`, {
						method: 'POST',
						json: { body: input.body, images },
					})
				)
			),
		...postHandlers(queryClient, (input) =>
			pendingMessage(
				myAuthor,
				placeOf(room),
				input.body,
				pendingImages(queryClient, input.images)
			)
		),
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

// The admin goes with one of two views: the principal's message
// ("original") or the associate's other view of it. `messageId` is the
// other view's.
export function usePickView() {
	return useMutation({
		mutationFn: (input: { messageId: string; chosen: PickChoice }) =>
			adminFetch(`crew/messages/${input.messageId}/pick`, {
				method: 'POST',
				json: { chosen: input.chosen },
			}),
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
					['crew', 'charter'],
					['crew', 'workspace'],
					['crew', 'documents'],
					['crew', 'document'],
					painterStylesQuery().queryKey,
					runsQuery().queryKey,
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
			if (event.type === 'reply') {
				upsertReply(queryClient, event.place, event.message)
			}
			if (event.type === 'common-knowledge') {
				void queryClient.invalidateQueries({
					queryKey: commonKnowledgeQuery().queryKey,
				})
			}
			if (event.type === 'document') void documentChanged(queryClient, event)
			if (event.type === 'charter') {
				void queryClient.invalidateQueries({
					queryKey: charterQuery(event.room).queryKey,
				})
			}
			if (event.type === 'painter-styles') {
				void queryClient.invalidateQueries({
					queryKey: painterStylesQuery().queryKey,
				})
			}
			if (event.type === 'command') {
				void queryClient.invalidateQueries({
					queryKey: commandQuery().queryKey,
				})
			}
			if (event.type === 'run') {
				// Before the first fetch returns there is nothing to update, and the
				// fetch may predate this event.
				if (queryClient.getQueryData(runsQuery().queryKey)) {
					queryClient.setQueryData(runsQuery().queryKey, (runs) =>
						runs ? upsertRun(runs, event.run) : runs
					)
				} else {
					void queryClient.invalidateQueries({
						queryKey: runsQuery().queryKey,
					})
				}
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
