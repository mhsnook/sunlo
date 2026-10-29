import { defineTool, type ToolStep } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import * as v from 'valibot'
import {
	GITHUB_LIMITS,
	type CrewKey,
	type GithubDraftType,
} from '../../shared/crew'
import { withSql } from '../../worker/db'
import {
	describeIssueEdit,
	describeMilestoneEdit,
	draftText,
	DRAFTS_PER_RUN,
	EDITS_PER_RUN,
	findPersonalData,
	githubFor,
	personalDataRefusal,
	publishedText,
	type GithubClient,
	type PeopleIndex,
} from '../../worker/crew/github'
import { peopleIndex } from '../../worker/crew/queries'
import { roomFor } from '../crew'
import { assertBlocks, Text } from './posting'

const IssueNumber = v.pipe(v.number(), v.integer(), v.minValue(1))
const Labels = v.pipe(
	v.array(v.pipe(Text, v.maxLength(GITHUB_LIMITS.label))),
	v.maxLength(GITHUB_LIMITS.labels)
)
const Day = v.pipe(v.string(), v.isoDate())
const Title = v.pipe(Text, v.maxLength(GITHUB_LIMITS.title))
const Body = v.pipe(Text, v.maxLength(GITHUB_LIMITS.body))
const Description = v.pipe(Text, v.maxLength(GITHUB_LIMITS.description))

// The GitHub tools, for the crew members in `githubAccess`. "write" drafts
// cards for anything new, and edits epics, issues and milestones directly;
// "read" only reads. None exist until the GitHub App's secrets are set.
export function githubTools(agent: CrewKey, access: 'read' | 'write') {
	const github = githubFor(env)
	if (!github) return []
	const read = readTools(github)
	return access === 'write' ? [...read, ...writeTools(agent, github)] : read
}

function readTools(github: GithubClient) {
	const readIssue = defineTool({
		name: 'read_issue',
		description:
			'Read one issue or pull request on mhsnook/sunlo: its title, state, labels, milestone, body and latest comments.',
		input: v.object({ number: IssueNumber }),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			return { output: await github.readIssue(data.number) }
		},
	})

	const listMilestones = defineTool({
		name: 'list_milestones',
		description:
			'List the milestones on mhsnook/sunlo, with their descriptions, due dates and how many of their issues are open and closed.',
		input: v.object({
			state: v.optional(v.picklist(['open', 'all']), 'open'),
		}),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			return { output: await github.milestones(data.state) }
		},
	})

	const listEpics = defineTool({
		name: 'list_epics',
		description:
			'List the open epics on mhsnook/sunlo: the issues labelled "epic", with their milestones. Read one with read_issue for its checklist.',
		input: v.object({}),
		annotations: { readOnlyHint: true },
		async run() {
			return { output: await github.issues({ labels: 'epic' }) }
		},
	})

	const githubChanges = defineTool({
		name: 'github_changes_since',
		description:
			'List every issue and pull request on mhsnook/sunlo updated since a time, newest first, including closed ones and merged pull requests.',
		input: v.object({
			since: v.pipe(v.string(), v.isoTimestamp()),
		}),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			return { output: await github.issues({ since: data.since }) }
		},
	})

	return [readIssue, listMilestones, listEpics, githubChanges]
}

function writeTools(agent: CrewKey, github: GithubClient) {
	// Every username and user id, loaded once and only when needed.
	let people: Promise<PeopleIndex> | null = null

	// Throwing hands the reason to the model, which rewrites the text and
	// calls the tool again.
	async function assertNoPersonalData(text: string, outcome: string) {
		if (!text) return
		people ??= withSql(env.HYPERDRIVE, 10_000, peopleIndex)
		const found = findPersonalData(text, await people)
		if (found) throw new Error(personalDataRefusal(outcome, found))
	}

	async function draft(
		step: ToolStep,
		input: { draft: GithubDraftType; why: string }
	) {
		const { drafts } = await (await roomFor()).githubWritesThisRun(agent)
		if (drafts >= DRAFTS_PER_RUN) {
			throw new Error(
				`You have drafted ${DRAFTS_PER_RUN} GitHub cards this run, the most one run may. Draft the rest on your next run.`
			)
		}
		assertBlocks(input.why)
		await assertNoPersonalData(
			publishedText([draftText(input.draft), input.why]),
			'Nothing was drafted'
		)
		const messageId = await step.do('draft', async () =>
			(await roomFor()).draftForGithub({ author: agent, ...input })
		)
		return {
			output: {
				messageId,
				note: 'The draft is a card in your room. Nothing is on GitHub until the admin files it.',
			},
		}
	}

	// A direct edit: counted, checked for personal data, made, and listed in
	// the run's receipt.
	async function applyEdit<T>(
		step: ToolStep,
		input: {
			published: Array<string | Array<string> | undefined>
			edit: () => Promise<T>
			receipt: (result: T) => string
		}
	) {
		const { edits } = await (await roomFor()).githubWritesThisRun(agent)
		if (edits >= EDITS_PER_RUN) {
			throw new Error(
				`You have made ${EDITS_PER_RUN} GitHub edits this run, the most one run may. Make the rest on your next run.`
			)
		}
		await assertNoPersonalData(
			publishedText(input.published),
			'Nothing was changed'
		)
		const result = await step.do('edit', input.edit)
		await step.do('receipt', async () => {
			await (await roomFor()).workspaceEdited(agent, input.receipt(result))
			return true
		})
		return { output: result }
	}

	const Why = v.pipe(Text, v.maxLength(1000))

	const draftIssue = defineTool({
		name: 'draft_issue',
		description:
			'Draft a new issue on mhsnook/sunlo, usually an epic: label it "epic", give it a checklist of PR-sized steps, and put it in a milestone. The admin gets a card in your room; they can edit the draft, then file it, and you hear back with the issue number. `why` is one or two sentences for the admin, shown on the card.',
		input: v.object({
			title: Title,
			body: Body,
			labels: v.optional(Labels, []),
			milestone: v.optional(IssueNumber),
			why: Why,
		}),
		durable: true,
		async run({ data, step }) {
			const milestone = data.milestone
				? await github.milestone(data.milestone)
				: null
			if (data.milestone && !milestone) {
				throw new Error(
					`mhsnook/sunlo has no milestone ${data.milestone}. Check list_milestones, or draft the milestone first.`
				)
			}
			return await draft(step, {
				draft: {
					type: 'issue',
					title: data.title,
					body: data.body,
					labels: data.labels,
					milestone: milestone?.number ?? null,
					milestoneTitle: milestone?.title ?? null,
				},
				why: data.why,
			})
		},
	})

	const draftMilestone = defineTool({
		name: 'draft_milestone',
		description:
			'Draft a new milestone on mhsnook/sunlo. The admin gets a card in your room, can edit it, and files it; you hear back with its number. `dueOn` is YYYY-MM-DD.',
		input: v.object({
			title: Title,
			description: Description,
			dueOn: v.optional(Day),
			why: Why,
		}),
		durable: true,
		async run({ data, step }) {
			return await draft(step, {
				draft: {
					type: 'milestone',
					title: data.title,
					description: data.description,
					dueOn: data.dueOn ?? null,
				},
				why: data.why,
			})
		},
	})

	const draftComment = defineTool({
		name: 'draft_comment',
		description:
			'Draft a comment on an issue or pull request on mhsnook/sunlo. The admin gets a card in your room, can edit it, and files it.',
		input: v.object({
			issue: IssueNumber,
			body: Body,
			why: Why,
		}),
		durable: true,
		async run({ data, step }) {
			return await draft(step, {
				draft: { type: 'comment', issue: data.issue, body: data.body },
				why: data.why,
			})
		},
	})

	const editIssue = defineTool({
		name: 'edit_issue',
		description:
			'Change an issue on mhsnook/sunlo directly: its title, its whole body (such as an epic with a checklist item ticked), its labels (the full list), its milestone (null takes it out), or its state. Read it first with read_issue, so you edit the current text. The room lists the change in your run receipt.',
		input: v.object({
			number: IssueNumber,
			title: v.optional(Title),
			body: v.optional(Body),
			labels: v.optional(Labels),
			milestone: v.optional(v.nullable(IssueNumber)),
			state: v.optional(v.picklist(['open', 'closed'])),
		}),
		durable: true,
		async run({ data, step }) {
			const { number, ...change } = data
			if (!Object.keys(change).length) throw new Error('Nothing to change.')
			return await applyEdit(step, {
				published: [change.title, change.body, change.labels],
				edit: () => github.editIssue(number, change),
				receipt: (issue) =>
					describeIssueEdit(number, change, issue.milestone?.title ?? null),
			})
		},
	})

	const editMilestone = defineTool({
		name: 'edit_milestone',
		description:
			'Change a milestone on mhsnook/sunlo directly: its title, description, due date (YYYY-MM-DD) or state. The room lists the change in your run receipt.',
		input: v.object({
			number: IssueNumber,
			title: v.optional(Title),
			description: v.optional(Description),
			dueOn: v.optional(Day),
			state: v.optional(v.picklist(['open', 'closed'])),
		}),
		durable: true,
		async run({ data, step }) {
			const { number, ...change } = data
			if (!Object.keys(change).length) throw new Error('Nothing to change.')
			return await applyEdit(step, {
				published: [change.title, change.description],
				edit: () => github.editMilestone(number, change),
				receipt: (milestone) => describeMilestoneEdit(milestone.title, change),
			})
		},
	})

	const noteStyle = defineTool({
		name: 'note_writing_style',
		description:
			'Save how the admin likes GitHub issues written, such as "Checklist items start with a verb" or "No headings in a short brief". Learn it from the changes they make to your drafts before filing. Check these memories before you draft.',
		input: v.object({ text: v.pipe(Text, v.maxLength(300)) }),
		async run({ data }) {
			const id = await (
				await roomFor()
			).remember(agent, data.text, { kind: 'style', domain: null })
			return { output: { id } }
		},
	})

	return [
		draftIssue,
		draftMilestone,
		draftComment,
		editIssue,
		editMilestone,
		noteStyle,
	]
}
