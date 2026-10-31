import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/core'
import { draftTitle, type GithubDraftType } from '../../shared/crew'

// Every issue the crew files carries this label.
export const ISSUE_LABEL = 'from-crew'
// Loop guards for one run: cards drafted for GitHub, and direct edits.
export const DRAFTS_PER_RUN = 5
export const EDITS_PER_RUN = 20

export type Filed = { number: number; url: string }

export type IssueChange = {
	title?: string
	body?: string
	labels?: Array<string>
	// Null takes the issue out of its milestone.
	milestone?: number | null
	state?: 'open' | 'closed'
}

export type MilestoneChange = {
	title?: string
	description?: string
	// YYYY-MM-DD.
	dueOn?: string
	state?: 'open' | 'closed'
}

type Request = Octokit['request']
type IssueData = {
	number: number
	title: string
	body?: string | null
	state: string
	html_url: string
	updated_at: string
	labels: Array<string | { name?: string }>
	milestone: { number: number; title: string } | null
	pull_request?: { merged_at?: string | null }
}
type MilestoneData = {
	number: number
	title: string
	description: string | null
	state: string
	due_on: string | null
	open_issues: number
	closed_issues: number
	html_url: string
}

const labelNames = (labels: IssueData['labels']) =>
	labels.flatMap((label) =>
		typeof label === 'string' ? [label] : label.name ? [label.name] : []
	)

const toIssue = (data: IssueData) => ({
	number: data.number,
	title: data.title,
	state: data.state,
	url: data.html_url,
	updatedAt: data.updated_at,
	labels: labelNames(data.labels),
	milestone: data.milestone
		? { number: data.milestone.number, title: data.milestone.title }
		: null,
	// Set for a pull request, which GitHub lists as an issue too.
	pullRequest: data.pull_request
		? { merged: !!data.pull_request.merged_at }
		: null,
})

const toMilestone = (data: MilestoneData) => ({
	number: data.number,
	title: data.title,
	description: data.description ?? '',
	state: data.state,
	dueOn: data.due_on?.slice(0, 10) ?? null,
	openIssues: data.open_issues,
	closedIssues: data.closed_issues,
	url: data.html_url,
})

// GitHub takes a due date as a timestamp, and keeps its date.
const dueOn = (date: string) => `${date}T12:00:00Z`

export const githubConfigured = (
	env: Env
): env is Env & {
	GITHUB_APP_ID: string
	GITHUB_APP_INSTALLATION_ID: string
	GITHUB_APP_PRIVATE_KEY: string
} =>
	!!env.GITHUB_APP_ID &&
	!!env.GITHUB_APP_INSTALLATION_ID &&
	!!env.GITHUB_APP_PRIVATE_KEY

// Null when the GitHub App secrets are not set: agents then get no
// GitHub tools at all.
export function githubFor(env: Env) {
	if (!githubConfigured(env)) return null
	if (env.GITHUB_APP_PRIVATE_KEY.includes('BEGIN RSA PRIVATE KEY')) {
		throw new Error(
			'GITHUB_APP_PRIVATE_KEY is in PKCS#1 format; Workers need PKCS#8 (apps/admin/README.md, "GitHub: milestones and epics")'
		)
	}
	const octokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: env.GITHUB_APP_ID,
			installationId: env.GITHUB_APP_INSTALLATION_ID,
			privateKey: env.GITHUB_APP_PRIVATE_KEY,
		},
	})
	return githubClient(octokit.request, env.GITHUB_REPO)
}

export type GithubClient = ReturnType<typeof githubClient>

export function githubClient(request: Request, repository: string) {
	const [owner, repo] = repository.split('/')
	const at = { owner, repo }

	return {
		// Publishes a draft the admin filed from its card.
		async file(draft: GithubDraftType): Promise<Filed> {
			if (draft.type === 'issue') {
				const { data } = await request('POST /repos/{owner}/{repo}/issues', {
					...at,
					title: draft.title,
					body: draft.body,
					labels: [...new Set([...draft.labels, ISSUE_LABEL])],
					milestone: draft.milestone ?? undefined,
				})
				return { number: data.number, url: data.html_url }
			}
			if (draft.type === 'milestone') {
				const { data } = await request(
					'POST /repos/{owner}/{repo}/milestones',
					{
						...at,
						title: draft.title,
						description: draft.description,
						due_on: draft.dueOn ? dueOn(draft.dueOn) : undefined,
					}
				)
				return { number: data.number, url: data.html_url }
			}
			const { data } = await request(
				'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
				{ ...at, issue_number: draft.issue, body: draft.body }
			)
			return { number: draft.issue, url: data.html_url }
		},

		async editIssue(issueNumber: number, change: IssueChange) {
			const { data } = await request(
				'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
				{ ...at, issue_number: issueNumber, ...change }
			)
			return toIssue(data)
		},

		async editMilestone(milestoneNumber: number, change: MilestoneChange) {
			const { dueOn: due, ...rest } = change
			const { data } = await request(
				'PATCH /repos/{owner}/{repo}/milestones/{milestone_number}',
				{
					...at,
					milestone_number: milestoneNumber,
					...rest,
					...(due === undefined ? {} : { due_on: dueOn(due) }),
				}
			)
			return toMilestone(data)
		},

		// An issue with its body and its latest comments.
		async readIssue(issueNumber: number) {
			const [{ data: issue }, { data: comments }] = await Promise.all([
				request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
					...at,
					issue_number: issueNumber,
				}),
				request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
					...at,
					issue_number: issueNumber,
					per_page: 30,
				}),
			])
			return {
				...toIssue(issue),
				body: issue.body ?? '',
				comments: comments.map((comment) => ({
					author: comment.user?.login ?? 'unknown',
					at: comment.created_at,
					body: comment.body ?? '',
				})),
			}
		},

		// Null when the repository has no milestone with that number.
		async milestone(milestoneNumber: number) {
			try {
				const { data } = await request(
					'GET /repos/{owner}/{repo}/milestones/{milestone_number}',
					{ ...at, milestone_number: milestoneNumber }
				)
				return toMilestone(data)
			} catch (error) {
				if ((error as { status?: number }).status === 404) return null
				throw error
			}
		},

		async milestones(state: 'open' | 'all') {
			const { data } = await request('GET /repos/{owner}/{repo}/milestones', {
				...at,
				state,
				per_page: 100,
			})
			return (data as Array<MilestoneData>).map(toMilestone)
		},

		// Open epics, or every issue and pull request updated since a time.
		async issues(query: { labels?: string; since?: string }) {
			const { data } = await request('GET /repos/{owner}/{repo}/issues', {
				...at,
				state: query.since ? 'all' : 'open',
				labels: query.labels,
				since: query.since,
				sort: 'updated',
				per_page: 100,
			})
			return (data as Array<IssueData>).map(toIssue)
		},
	}
}

// Lower-cased, as findPersonalData compares them.
export type PeopleIndex = {
	usernames: Set<string>
	uids: Set<string>
}

const EMAIL_PATTERN = /[^\s@<>()"']+@[^\s@<>()"']+\.[^\s@<>()"']+/
const UUID_PATTERN =
	/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

// The repo is public, so an issue must not identify a Sunlo user. Returns
// a description of the first thing that would, or null when the text is
// clean.
export function findPersonalData(text: string, people: PeopleIndex) {
	const email = text.match(EMAIL_PATTERN)
	if (email) return `an email address (${email[0]})`
	for (const uuid of text.match(UUID_PATTERN) ?? []) {
		if (people.uids.has(uuid.toLowerCase())) return `a user id (${uuid})`
	}
	const lowered = text.toLowerCase()
	for (const username of people.usernames) {
		const pattern = new RegExp(
			`(^|[^\\p{L}\\p{N}])${escapeRegExp(username)}($|[^\\p{L}\\p{N}])`,
			'u'
		)
		if (pattern.test(lowered)) return `the username "${username}"`
	}
	return null
}

// The refusal for text that would publish personal data on the public
// repository; the agent or the admin takes it out and tries again.
export const personalDataRefusal = (outcome: string, found: string) =>
	`${outcome}: it contains ${found}, and mhsnook/sunlo is public. Take it out, describing people by counts or patterns instead.`

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Every text a draft or an edit would publish, joined for findPersonalData.
export const publishedText = (
	parts: Array<string | Array<string> | undefined | null>
) => parts.flat().filter(Boolean).join('\n')

export const draftText = (draft: GithubDraftType) =>
	draft.type === 'issue'
		? publishedText([draft.title, draft.body, draft.labels])
		: draft.type === 'milestone'
			? publishedText([draft.title, draft.description])
			: draft.body

// What reaches the agent once the admin files its draft. When the admin
// changed the draft first, both versions go, so the agent can learn how the
// admin writes. Their note is for the agent only: it never reaches GitHub.
export function filingReport(input: {
	drafted: GithubDraftType
	filed: GithubDraftType
	result: Filed
	by: string
	note: string | null
}) {
	const { drafted, filed, result, by, note } = input
	const where =
		filed.type === 'comment' ? result.url : `#${result.number}, ${result.url}`
	const opening = `${by} filed your ${filed.type} draft "${draftTitle(drafted)}" (${where})`
	const roadmap =
		filed.type === 'comment' ? '' : ' Put its number in the Roadmap.'
	const noted = note ? `Their note to you, in your room: ${note}` : null
	if (JSON.stringify(drafted) === JSON.stringify(filed)) {
		return [`${opening} as you wrote it.${roadmap}`, noted]
			.filter(Boolean)
			.join('\n\n')
	}
	return [
		`${opening}, after changing it.${roadmap}`,
		noted,
		`Your draft:\n${JSON.stringify(drafted, null, 2)}`,
		`What ${by} filed:\n${JSON.stringify(filed, null, 2)}`,
		'If the changes show how they like issues written, save that with note_writing_style.',
	]
		.filter(Boolean)
		.join('\n\n')
}

// One receipt line for a direct edit, built from what the tool changed.
export function describeIssueEdit(
	issueNumber: number,
	change: IssueChange,
	milestoneTitle: string | null
) {
	const parts = [
		change.title !== undefined && 'title',
		change.body !== undefined && 'body',
		change.labels !== undefined &&
			`labels to ${change.labels.join(', ') || 'none'}`,
		change.milestone !== undefined &&
			(change.milestone === null
				? 'out of its milestone'
				: `to milestone "${milestoneTitle ?? change.milestone}"`),
		change.state === 'closed' && 'closed it',
		change.state === 'open' && 'reopened it',
	].filter((part): part is string => !!part)
	return `edited #${issueNumber}: ${parts.join('; ')}`
}

export function describeMilestoneEdit(title: string, change: MilestoneChange) {
	const parts = [
		change.title !== undefined && `title to "${change.title}"`,
		change.description !== undefined && 'description',
		change.dueOn !== undefined && `due ${change.dueOn}`,
		change.state === 'closed' && 'closed it',
		change.state === 'open' && 'reopened it',
	].filter((part): part is string => !!part)
	return `edited milestone "${title}": ${parts.join('; ')}`
}
