import { defineTool, type ToolStep } from '@flue/runtime'
import * as v from 'valibot'
import {
	crew,
	crewKeys,
	displayName,
	resolveHandle,
	principalOf,
	handleOf,
	placeOf,
	COMMON_ROOM,
	roomKeys,
	roommatesOf,
	roomNames,
	roomOf,
	type ActionType,
	type CardType,
	type CrewKey,
	type CrewMessageType,
	type PlaceType,
} from '../../shared/crew'
import type { Wake } from '../../worker/crew/room'
import type { RunKey } from '../../worker/crew/runs'
import { toBase64 } from '../../worker/images'
import { roomFor, wake } from '../crew'
import { assertBlocks, Options, Text, toActions } from './posting'

const Id = v.pipe(v.number(), v.integer())

type Written = { message: CrewMessageType; wake: Array<Wake> }

const defaultActions: Record<
	'decide' | 'confirm' | 'know' | 'escalate',
	Array<ActionType>
> = {
	decide: [
		{ id: 'yes', label: 'Yes' },
		{ id: 'no', label: 'No' },
	],
	confirm: [
		{ id: 'right', label: "That's right" },
		{ id: 'undo', label: 'Undo it' },
	],
	know: [],
	escalate: [
		{ id: 'will-look', label: "I'll look into it" },
		{ id: 'not-now', label: 'Not now' },
	],
}

// The tools every crew member has: talking in the Common Room and in its
// own room, bringing the admin cards, side-threads, and keeping its
// workspace. In a side-thread's own run (`thread`), reply_in_thread answers
// that thread, and pass_note is left out.
export function crewTools(
	agent: CrewKey,
	thread: RunKey,
	options: { seesImages: boolean }
) {
	const name = displayName(agent)
	const ownRoom = roomOf(agent)
	const place = placeOf(ownRoom)
	const room = roomNames[ownRoom]
	const roommates = roommatesOf(agent)

	// Writes a message, then wakes whoever it reaches, as durable steps, so a
	// retried run neither posts twice nor wakes twice. A refusal is thrown to
	// the model.
	async function writeAndWake<W extends Written>(
		step: ToolStep,
		body: string,
		write: () => Promise<W | { ok: false; error: string }>
	) {
		assertBlocks(body)
		const written = await step.do('post', write)
		if ('error' in written) throw new Error(written.error)
		await step.do('wake', () => wake(written.wake, name).then(() => true))
		return written
	}

	async function postAndWake(
		step: ToolStep,
		input: {
			body: string
			card: CardType | null
			place: PlaceType
			otherView?: boolean
		}
	) {
		const { message, wake: wakes } = await writeAndWake(
			step,
			input.body,
			async () => (await roomFor()).postFromAgent({ agent, ...input })
		)
		return {
			messageId: message.id,
			woke: wakes.map((w) => displayName(w.agent)),
		}
	}

	const postToCrew = defineTool({
		name: 'post_to_common_room',
		description:
			'Post a message in the Common Room, where the admin and the other agents read it. Write @Name to address a crew member. Add `options` (2 or 3 short button labels, such as "Hide it" and "Show me") only when you need the admin to choose; their answer comes back to you.',
		input: v.object({
			body: Text,
			options: v.optional(Options),
		}),
		durable: true,
		async run({ data, step }) {
			const card = data.options
				? {
						kind: 'question' as const,
						title: null,
						actions: toActions(data.options),
						ref: null,
					}
				: null
			return {
				output: await postAndWake(step, {
					body: data.body,
					card,
					place: COMMON_ROOM,
				}),
			}
		},
	})

	const associate = crew[agent].role === 'associate'
	const principal = displayName(principalOf(ownRoom))
	const postToRoom = defineTool({
		name: 'post_to_room',
		description: `Post a message in the ${room}, where the admin talks with you${roommates.length ? ` and ${roommates.map(displayName).join(' and ')}` : ''}. Answer a <room-message> here.${roommates.length ? ` Write ${roommates.map((key) => `@${handleOf(key)}`).join(' or ')} to hand ${roommates.length === 1 ? 'them' : 'one of them'} the floor.` : ''}${associate ? ` Set otherView when ${principal} asked you in, and your answer differs from theirs: the app shows yours beside the message that asked you, and the admin goes with one of the two.` : ''}`,
		// The room ignores otherView from a principal.
		input: v.object({ body: Text, otherView: v.optional(v.boolean()) }),
		durable: true,
		async run({ data, step }) {
			return {
				output: await postAndWake(step, {
					body: data.body,
					card: null,
					place,
					otherView: data.otherView,
				}),
			}
		},
	})

	const proposeCharter = defineTool({
		name: 'propose_charter',
		description: `Propose an entry for the ${room}'s charter, its memory of the admin. A principle is about their philosophy, strategy or taste; a lesson is how they decide in a kind of situation ("When X, they prefer Y, because Z"). It counts only after they keep it, so never act on a proposal as if it were kept.`,
		input: v.object({
			kind: v.picklist(['principle', 'lesson']),
			text: v.pipe(Text, v.maxLength(300)),
			why: v.pipe(Text, v.maxLength(600)),
		}),
		durable: true,
		async run({ data, step }) {
			const messageId = await step.do('propose', async () =>
				(await roomFor()).proposeCharter({ author: agent, ...data })
			)
			return { output: { messageId } }
		},
	})

	const bringToAdmin = defineTool({
		name: 'bring_to_admin',
		description: `Bring the admin a card in the ${room}: the short list they read instead of the whole Common Room. Kinds:
- decide: you need their call, and the matter is on hold until they answer. Give 2 or 3 short options, or leave them out for Yes and No.
- confirm: you already acted in their stead, and ask whether that was right. Only for reversible actions that a kept charter entry or an earlier answer of theirs clearly covers.
- know: worth knowing, nothing to answer. One or two sentences.
- escalate: it needs more than the crew has, such as an engineer or a Claude Code session. Write the body as a brief that a person could act on cold.
Their answer comes back to you.`,
		input: v.object({
			kind: v.picklist(['decide', 'confirm', 'know', 'escalate']),
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(4000)),
			options: v.optional(Options),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const messageId = await step.do('bring', async () =>
				(await roomFor()).bringToAdmin({
					author: agent,
					kind: data.kind,
					title: data.title,
					body: data.body,
					actions: data.options
						? toActions(data.options)
						: defaultActions[data.kind],
				})
			)
			return { output: { messageId } }
		},
	})

	const proposeChange = defineTool({
		name: 'propose_change',
		description: `Propose a change to your plan. The admin gets a "Change to the plan" card in the ${room} with Do it and Not yet. Do it saves the decision to your memory and adds the title as a to-do; Not yet saves that to your memory. Either way the answer comes back to you.`,
		input: v.object({
			title: v.pipe(Text, v.maxLength(120)),
			why: v.pipe(Text, v.maxLength(600)),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.why)
			const { message } = await step.do('post', async () =>
				(await roomFor()).postFromAgent({
					agent,
					body: data.why,
					card: {
						kind: 'change',
						title: data.title,
						actions: [
							{ id: 'do', label: 'Do it' },
							{ id: 'not-yet', label: 'Not yet' },
						],
						ref: null,
					},
					place,
				})
			)
			return { output: { messageId: message.id, title: data.title } }
		},
	})

	const readRoom = defineTool({
		name: 'read_room',
		description:
			'Read the latest messages in the Common Room, oldest first, when the room context you were given is not enough.',
		input: v.object({
			limit: v.optional(v.pipe(Id, v.minValue(1), v.maxValue(100)), 40),
		}),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			return await (await roomFor()).recentRoom(data.limit)
		},
	})

	// A tool result reaches the model only as text, so the picture goes to
	// the agent's own model in a harness prompt, and the answer comes back
	// in words.
	const lookAtImage = defineTool({
		name: 'look_at_image',
		description:
			'Look at an image the room keeps and answer a question about it: one the admin attached to a message, shown as "[image 12 attached, 1280×800]", a painting, or an SVG\'s rendering. Ask a pointed question, such as "What does the error say?"; the answer is what you saw, in words.',
		input: v.object({
			id: Id,
			question: v.pipe(Text, v.maxLength(1000)),
		}),
		harness: true,
		annotations: { readOnlyHint: true },
		async run({ data, harness }) {
			const image = await (await roomFor()).image(data.id)
			if (!image) throw new Error(`No image ${data.id}.`)
			const seen = await harness.prompt(
				`This is image ${data.id} (${image.width}×${image.height}). Answer this question about it, plainly and specifically: ${data.question}\n\nQuote any text in it exactly where it matters. Say what is there; do not guess at what is out of frame.`,
				{
					images: [
						{
							type: 'image',
							data: toBase64(new Uint8Array(image.bytes)),
							mimeType: image.mimeType,
						},
					],
				}
			)
			return { output: { looked_at: `image ${data.id}`, seen: seen.text } }
		},
	})

	const readDocument = defineTool({
		name: 'read_document',
		description: `Read a room's document: its current Markdown and its revision. Leave out \`room\` for the ${room}'s own documents, which your <crew-context> lists.`,
		input: v.object({
			name: v.pipe(Text, v.maxLength(80)),
			room: v.optional(v.picklist(roomKeys)),
		}),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			const read = await (
				await roomFor()
			).readDocument(data.room ?? ownRoom, data.name)
			if (!read.ok) throw new Error(read.error)
			const { document } = read
			return {
				output: {
					name: document.name,
					room: document.room,
					revision: document.revision,
					savedBy: document.byName,
					savedAt: document.at,
					markdown: document.text,
				},
			}
		},
	})

	const writeDocument = defineTool({
		name: 'write_document',
		description: `Save a new revision of one of the ${room}'s documents, or start a new one. \`markdown\` is the whole document, not a change to it. \`baseRevision\` is the revision you read and changed, or 0 for a document nobody has written. If someone saved a newer revision since you read it, nothing is saved: read it again, put your change into the current text, and save from the new revision. \`summary\` is one line on what changed, shown in the document's history.`,
		input: v.object({
			name: v.pipe(Text, v.maxLength(80)),
			markdown: Text,
			baseRevision: v.pipe(Id, v.minValue(0)),
			summary: v.pipe(Text, v.maxLength(140)),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.markdown, 'saved')
			const saved = await step.do('save', async () =>
				(await roomFor()).writeDocument({
					agent,
					name: data.name,
					text: data.markdown,
					baseRevision: data.baseRevision,
					summary: data.summary,
					thread,
				})
			)
			if (!saved.ok) throw new Error(saved.error)
			return { output: { revision: saved.revision } }
		},
	})

	const addTodo = defineTool({
		name: 'add_todo',
		description:
			'Add a to-do to your own list, for work you will do. `note` is a short status line, such as "About half written" or "Waiting on Library".',
		input: v.object({
			text: v.pipe(Text, v.maxLength(200)),
			note: v.optional(v.pipe(Text, v.maxLength(80))),
		}),
		async run({ data }) {
			const id = await (
				await roomFor()
			).addTodo(agent, data.text, data.note ?? null, thread)
			return { output: { id } }
		},
	})

	const updateTodo = defineTool({
		name: 'update_todo',
		description:
			'Mark one of your to-dos done or not done, or change its note. Pass note as an empty string to clear it.',
		input: v.object({
			id: Id,
			done: v.optional(v.boolean()),
			note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
		}),
		async run({ data }) {
			const ok = await (
				await roomFor()
			).updateTodo(
				agent,
				data.id,
				{
					done: data.done,
					note: data.note === undefined ? undefined : data.note || null,
				},
				thread
			)
			if (!ok) throw new Error(`You have no to-do with id ${data.id}`)
			return 'Updated.'
		},
	})

	const remember = defineTool({
		name: 'remember',
		description:
			'Save a durable fact or decision to your memory, which you read at the start of every run. Never save numbers a query can recompute.',
		input: v.object({ text: v.pipe(Text, v.maxLength(400)) }),
		async run({ data }) {
			return {
				output: {
					id: await (await roomFor()).remember(agent, data.text, null, thread),
				},
			}
		},
	})

	const forget = defineTool({
		name: 'forget',
		description: 'Delete a memory that is wrong or no longer true.',
		input: v.object({ id: Id }),
		async run({ data }) {
			if (!(await (await roomFor()).forget(agent, data.id, 'agent', thread))) {
				throw new Error(`You have no memory with id ${data.id}`)
			}
			return 'Forgotten.'
		},
	})

	const addOpenItem = defineTool({
		name: 'add_open_item',
		description:
			'Add an item to "Open with you": something waiting on the admin, such as a piece of work to schedule or a decision to make. `tag` is one word for its kind, such as Refactor, Content or Onboarding.',
		input: v.object({
			title: v.pipe(Text, v.maxLength(120)),
			tag: v.optional(v.pipe(Text, v.maxLength(20))),
		}),
		async run({ data }) {
			const id = await (
				await roomFor()
			).addOpenItem(agent, data.title, data.tag ?? null, thread)
			return { output: { id } }
		},
	})

	const closeOpenItem = defineTool({
		name: 'close_open_item',
		description:
			'Close an "Open with you" item that is done or no longer open.',
		input: v.object({ id: Id }),
		async run({ data }) {
			if (!(await (await roomFor()).closeOpenItem(agent, data.id, thread))) {
				throw new Error(`You have no open item with id ${data.id}`)
			}
			return 'Closed.'
		},
	})

	const passNote = defineTool({
		name: 'pass_note',
		description:
			'Ask another officer, in any room including your own, for a small favour, such as one check or one number, in a side-thread off a note in your room. Write their handle in `to`. They see only the thread, and their reply reaches you as a <thread-reply>.',
		input: v.object({
			to: v.picklist(crewKeys.map(handleOf)),
			body: v.pipe(Text, v.maxLength(2000)),
		}),
		durable: true,
		async run({ data, step }) {
			const helper = resolveHandle(data.to)
			if (!helper) throw new Error(`No crew member answers to ${data.to}.`)
			const note = await writeAndWake(step, data.body, async () =>
				(await roomFor()).passNote({ asker: agent, helper, body: data.body })
			)
			return { output: { thread: note.message.id } }
		},
	})

	const replyInThread = defineTool({
		name: 'reply_in_thread',
		description: thread
			? 'Reply in this side-thread. Set close when the favour is done.'
			: 'Reply in a side-thread you started, by its id (the thread a <thread-reply> names). Set close when you have what you need.',
		input: v.object({
			// Ignored in a side-thread's own run, which replies to its thread.
			thread: v.optional(v.pipe(Text, v.maxLength(40))),
			body: v.pipe(Text, v.maxLength(4000)),
			close: v.optional(v.boolean(), false),
		}),
		durable: true,
		async run({ data, step }) {
			const root = thread ?? data.thread
			if (!root) throw new Error('Name the side-thread to reply in.')
			const { closed } = await writeAndWake<Written & { closed: boolean }>(
				step,
				data.body,
				async () =>
					(await roomFor()).replyInThread({
						agent,
						root,
						body: data.body,
						close: data.close,
					})
			)
			return closed ? 'Replied, and the thread is closed.' : 'Replied.'
		},
	})

	return [
		postToCrew,
		postToRoom,
		proposeCharter,
		bringToAdmin,
		proposeChange,
		readRoom,
		...(options.seesImages ? [lookAtImage] : []),
		writeDocument,
		// A note from a thread run would start a second thread, in this
		// agent's own room and unlinked from the one it is answering.
		...(thread ? [] : [passNote]),
		replyInThread,
		readDocument,
		addTodo,
		updateTodo,
		remember,
		forget,
		addOpenItem,
		closeOpenItem,
	]
}
