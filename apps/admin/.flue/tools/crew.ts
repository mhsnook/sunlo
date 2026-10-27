import { defineTool } from '@flue/runtime'
import * as v from 'valibot'
import { crew, type CrewKey } from '../../shared/crew'
import { TEAM } from '../../worker/crew/room'
import { roomFor, wake } from '../crew'
import { assertBlocks, Options, Text, toActions } from './posting'

const Id = v.pipe(v.number(), v.integer())

// The room and workspace tools for one agent. `conversation` is "team" for a
// run in the crew room and "dm-<uid>" for a 1:1 chat; a card raised in a 1:1
// chat shows in that chat and the workspace, not in the room.
export function crewTools(agent: CrewKey, conversation: string) {
	const name = crew[agent].name
	const place = conversation === TEAM ? 'room' : 'dm'

	const postToCrew = defineTool({
		name: 'post_to_crew',
		description:
			'Post a message in the crew room, where the admin and the other agents read it. Write @Name to address a crew member. Add `options` (2 or 3 short button labels, such as "Hide it" and "Show me") only when you need the admin to choose; their answer comes back to you.',
		input: v.object({
			body: Text,
			options: v.optional(Options),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const { message, wake: wakes } = await step.do('post', async () =>
				(await roomFor()).postFromAgent({
					agent,
					body: data.body,
					card: data.options
						? {
								kind: 'question' as const,
								title: null,
								actions: toActions(data.options),
							}
						: null,
					place: 'room',
					conversation,
				})
			)
			await step.do('wake', () => wake(wakes, name).then(() => true))
			return {
				output: {
					messageId: message.id,
					woke: wakes.map((w) => crew[w.agent].name),
				},
			}
		},
	})

	const proposeChange = defineTool({
		name: 'propose_change',
		description:
			'Propose a change to your plan. The admin gets a "Change to the plan" card with Do it and Not yet. Do it saves the decision to your memory and adds the title as a to-do; Not yet saves that to your memory. Either way the answer comes back to you. In a 1:1 chat the card shows in the chat; otherwise it shows in the crew room.',
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
					},
					place,
					conversation,
				})
			)
			return { output: { messageId: message.id, title: data.title } }
		},
	})

	const readRoom = defineTool({
		name: 'read_room',
		description:
			'Read the latest messages in the crew room, oldest first, when the room context you were given is not enough.',
		input: v.object({
			limit: v.optional(v.pipe(Id, v.minValue(1), v.maxValue(100)), 40),
		}),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			return await (await roomFor()).recentRoom(data.limit)
		},
	})

	const addTodo = defineTool({
		name: 'add_todo',
		description:
			'Add a to-do to your own list, for work you will do. `note` is a short status line, such as "About half written" or "Waiting on Monitor".',
		input: v.object({
			text: v.pipe(Text, v.maxLength(200)),
			note: v.optional(v.pipe(Text, v.maxLength(80))),
		}),
		async run({ data }) {
			const id = await (
				await roomFor()
			).addTodo(agent, data.text, data.note ?? null)
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
			).updateTodo(agent, data.id, {
				done: data.done,
				note: data.note === undefined ? undefined : data.note || null,
			})
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
				output: { id: await (await roomFor()).remember(agent, data.text) },
			}
		},
	})

	const forget = defineTool({
		name: 'forget',
		description: 'Delete a memory that is wrong or no longer true.',
		input: v.object({ id: Id }),
		async run({ data }) {
			if (!(await (await roomFor()).forget(agent, data.id, 'agent'))) {
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
			).addOpenItem(agent, data.title, data.tag ?? null)
			return { output: { id } }
		},
	})

	const closeOpenItem = defineTool({
		name: 'close_open_item',
		description:
			'Close an "Open with you" item that is done or no longer open.',
		input: v.object({ id: Id }),
		async run({ data }) {
			if (!(await (await roomFor()).closeOpenItem(agent, data.id))) {
				throw new Error(`You have no open item with id ${data.id}`)
			}
			return 'Closed.'
		},
	})

	return [
		postToCrew,
		proposeChange,
		readRoom,
		addTodo,
		updateTodo,
		remember,
		forget,
		addOpenItem,
		closeOpenItem,
	]
}
