import { z } from 'zod'
import {
	GITHUB_CLOSED_DAYS,
	type GithubEventType,
	type GithubItemType,
} from '../../shared/crew'
import { hmacKey } from '../images'
import { labelNames } from './github'
import type { Sql } from './paintings'
import { clip } from './steps'

// Issue and pull request titles are anyone's text on a public repository.
export const GITHUB_TITLE_MAX = 200
const LABEL_MAX = 50
const LABELS_MAX = 10
export const MAX_WEBHOOK_BYTES = 1_000_000
// Deliveries are kept this long to spot a redelivery.
export const DELIVERY_DAYS = 7

// X-Hub-Signature-256 is "sha256=" and the hex HMAC-SHA256 of the raw body,
// keyed with the webhook's secret. False without a secret, so a Worker with
// no secret set accepts nothing.
export async function verifyGithubSignature(
	secret: string | undefined,
	body: BufferSource,
	header: string | null | undefined
) {
	if (!secret || !header) return false
	const hex = /^sha256=([0-9a-f]{64})$/i.exec(header.trim())?.[1]
	if (!hex) return false
	// subtle.verify compares in constant time.
	return crypto.subtle.verify(
		'HMAC',
		await hmacKey(secret),
		Buffer.from(hex, 'hex'),
		body
	)
}

// One line of plain text: no control or format characters (newlines,
// bidirectional overrides, zero-width marks), at most `max` characters.
export const plainLine = (text: string, max: number) =>
	clip(
		text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' '),
		max
	)

const Label = z.union([z.string(), z.object({ name: z.string().optional() })])

// The fields shared by an issue and a pull request, in a webhook payload and
// in the REST API's issue list.
const IssueLike = z.object({
	number: z.number().int().positive(),
	title: z.string(),
	html_url: z.string(),
	state: z.string(),
	labels: z.array(Label).optional(),
	milestone: z.object({ title: z.string() }).nullish(),
	updated_at: z.string(),
	closed_at: z.string().nullish(),
	// On a pull request's own payload.
	merged_at: z.string().nullish(),
	// On a pull request in the REST API's issue list.
	pull_request: z.object({ merged_at: z.string().nullish() }).optional(),
})

// An issue or pull request as the room keeps it, or null when it is not one
// of `repository`'s.
export function githubItemOf(
	data: unknown,
	repository: string,
	kind?: GithubItemType['kind']
): GithubItemType | null {
	const parsed = IssueLike.safeParse(data)
	if (!parsed.success) return null
	const issue = parsed.data
	if (!issue.html_url.startsWith(`https://github.com/${repository}/`)) {
		return null
	}
	const merged = !!(issue.merged_at ?? issue.pull_request?.merged_at)
	return {
		number: issue.number,
		kind: kind ?? (issue.pull_request ? 'pr' : 'issue'),
		title: plainLine(issue.title, GITHUB_TITLE_MAX),
		url: issue.html_url,
		labels: labelNames(issue.labels ?? [])
			.map((label) => plainLine(label, LABEL_MAX))
			.filter(Boolean)
			.slice(0, LABELS_MAX),
		milestone: issue.milestone
			? plainLine(issue.milestone.title, GITHUB_TITLE_MAX)
			: null,
		state: issue.state === 'open' ? 'open' : merged ? 'merged' : 'closed',
		updatedAt: issue.updated_at,
		closedAt: issue.state === 'open' ? null : (issue.closed_at ?? null),
	}
}

const Payload = z.object({
	action: z.string(),
	repository: z.object({ full_name: z.string() }),
	issue: z.unknown().optional(),
	pull_request: z.unknown().optional(),
})

export type WebhookResult =
	| { kind: 'ping' }
	| { kind: 'ignore' }
	// The item left the repository, so it leaves the room's copy.
	| { kind: 'remove'; number: number }
	// `event` is null for a change that posts no line, such as a new label.
	| { kind: 'item'; item: GithubItemType; event: GithubEventType | null }

const LINE_ACTIONS = new Set(['opened', 'closed', 'reopened'])

// What one delivery means for the room, from its X-GitHub-Event name and its
// payload. Anything but an issue or a pull request of `repository` is
// ignored.
export function githubWebhook(
	name: string | null | undefined,
	payload: unknown,
	repository: string
): WebhookResult {
	if (name === 'ping') return { kind: 'ping' }
	if (name !== 'issues' && name !== 'pull_request') return { kind: 'ignore' }
	const parsed = Payload.safeParse(payload)
	if (!parsed.success) return { kind: 'ignore' }
	const { action, repository: repo } = parsed.data
	if (repo.full_name.toLowerCase() !== repository.toLowerCase()) {
		return { kind: 'ignore' }
	}
	const kind = name === 'issues' ? 'issue' : 'pr'
	const item = githubItemOf(
		kind === 'issue' ? parsed.data.issue : parsed.data.pull_request,
		repo.full_name,
		kind
	)
	if (!item) return { kind: 'ignore' }
	if (kind === 'issue' && (action === 'deleted' || action === 'transferred')) {
		return { kind: 'remove', number: item.number }
	}
	const event: GithubEventType | null = LINE_ACTIONS.has(action)
		? {
				kind,
				action: item.state === 'merged' ? 'merged' : (action as 'opened'),
				number: item.number,
				title: item.title,
				url: item.url,
			}
		: null
	return { kind: 'item', item, event }
}

// ---- The room's tables (github_item, github_delivery) ---------------------

type GithubItemRow = {
	number: number
	kind: GithubItemType['kind']
	title: string
	url: string
	labels: string
	milestone: string | null
	state: GithubItemType['state']
	updated_at: string
	closed_at: string | null
}

const toGithubItem = (row: GithubItemRow): GithubItemType => ({
	number: row.number,
	kind: row.kind,
	title: row.title,
	url: row.url,
	labels: JSON.parse(row.labels) as Array<string>,
	milestone: row.milestone,
	state: row.state,
	updatedAt: row.updated_at,
	closedAt: row.closed_at,
})

export const daysBefore = (at: number, days: number) =>
	new Date(at - days * 86_400_000).toISOString()

// True the first time the room sees a delivery id, false for a redelivery.
// The caller writes what the delivery means with no await after this, so
// two copies of one delivery cannot both pass.
export function takeDelivery(sql: Sql, id: string, at = Date.now()) {
	if (sql`select 1 from github_delivery where id = ${id}`.length) return false
	sql`insert into github_delivery (id, at) values (${id}, ${new Date(at).toISOString()})`
	return true
}

// Deliveries can arrive out of order: an older state never overwrites a
// newer one.
export function writeGithubItem(sql: Sql, item: GithubItemType) {
	sql`
		insert into github_item (number, kind, title, url, labels, milestone, state, updated_at, closed_at)
		values (${item.number}, ${item.kind}, ${item.title}, ${item.url}, ${JSON.stringify(item.labels)}, ${item.milestone}, ${item.state}, ${item.updatedAt}, ${item.closedAt})
		on conflict (number) do update set
			kind = excluded.kind,
			title = excluded.title,
			url = excluded.url,
			labels = excluded.labels,
			milestone = excluded.milestone,
			state = excluded.state,
			updated_at = excluded.updated_at,
			closed_at = excluded.closed_at
		where excluded.updated_at > github_item.updated_at`
}

export function removeGithubItem(sql: Sql, number: number) {
	sql`delete from github_item where number = ${number}`
}

export function pruneGithubLog(sql: Sql, at = Date.now()) {
	sql`delete from github_delivery where at < ${daysBefore(at, DELIVERY_DAYS)}`
	sql`
		delete from github_item
		where state != 'open'
			and coalesce(closed_at, updated_at) < ${daysBefore(at, GITHUB_CLOSED_DAYS)}`
}

// Open items first, then the recently closed, each newest first.
export const githubItems = (sql: Sql, at = Date.now()) =>
	sql<GithubItemRow>`
		select * from github_item
		where state = 'open'
			or coalesce(closed_at, updated_at) >= ${daysBefore(at, GITHUB_CLOSED_DAYS)}
		order by state = 'open' desc, coalesce(closed_at, updated_at) desc, number desc`.map(
		toGithubItem
	)
