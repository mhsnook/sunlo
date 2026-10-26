import { Agent } from 'agents'
import { createAI } from 'agents/models/ai-sdk'
import { generateText, isStepCount, tool } from 'ai'
import { z } from 'zod'
import { connect } from '../db'
import {
	COMMENTS_PER_RUN,
	findPersonalData,
	githubFor,
	ISSUES_PER_DAY,
	ISSUES_PER_RUN,
	type PeopleIndex,
} from './github'
import { REPORTER_SYSTEM_PROMPT, reporterUserMessage } from './prompt'
import {
	activityBetween,
	QueryRejectedError,
	runReadOnlyQuery,
} from './queries'

export type ReportStatus = 'writing' | 'done' | 'failed'

export type ReportView = {
	id: string
	since: string
	until: string
	status: ReportStatus
	body: string | null
	error: string | null
	created_at: string
	finished_at: string | null
}

export type NoteView = { id: number; text: string; created_at: string }

type ReportRow = ReportView & { uid: string; email: string }

const FIRST_WINDOW_DAYS = 7
const MAX_STEPS = 15
// A reload inside this window shows the report already written instead of
// paying for a new run.
const REUSE_REPORT_MS = 30 * 60 * 1000

// One instance, named "team", serves every admin. Its SQLite is the
// reporter's memory: the reports it wrote, which also mark when each admin
// last checked in, and the notes it chose to keep.
export class Reporter extends Agent<Env> {
	onStart() {
		this.sql`
			create table if not exists report (
				id text primary key,
				uid text not null,
				email text not null,
				since text not null,
				until text not null,
				status text not null,
				body text,
				error text,
				created_at text not null,
				finished_at text
			)`
		this
			.sql`create index if not exists report_uid_created on report (uid, created_at)`
		this.sql`
			create table if not exists filed_issue (
				number integer primary key,
				title text not null,
				url text not null,
				report_id text not null,
				created_at text not null
			)`
		this.sql`
			create table if not exists note (
				id integer primary key autoincrement,
				text text not null,
				created_at text not null
			)`
	}

	async checkIn(
		admin: { uid: string; email: string },
		options: { fresh?: boolean } = {}
	): Promise<ReportView> {
		const [latest] = this.sql<ReportRow>`
			select * from report where uid = ${admin.uid}
			order by created_at desc limit 1`
		const now = new Date()
		const isRecent =
			latest &&
			latest.status !== 'failed' &&
			now.getTime() - Date.parse(latest.created_at) < REUSE_REPORT_MS
		if (isRecent && !options.fresh) return toView(latest)

		// The window starts where the last finished report ended, so a failed
		// run never skips a stretch of time.
		const [lastDone] = this.sql<{ until: string }>`
			select until from report where uid = ${admin.uid} and status = 'done'
			order by created_at desc limit 1`
		const since =
			lastDone?.until ??
			new Date(now.getTime() - FIRST_WINDOW_DAYS * 86_400_000).toISOString()
		const report: ReportRow = {
			id: crypto.randomUUID(),
			uid: admin.uid,
			email: admin.email,
			since,
			until: now.toISOString(),
			status: 'writing',
			body: null,
			error: null,
			created_at: now.toISOString(),
			finished_at: null,
		}
		this.sql`
			insert into report (id, uid, email, since, until, status, created_at)
			values (${report.id}, ${report.uid}, ${report.email}, ${report.since},
				${report.until}, ${report.status}, ${report.created_at})`
		await this.schedule(0, 'writeReport', { reportId: report.id })
		return toView(report)
	}

	getReport(id: string, uid: string): ReportView | null {
		const [row] = this.sql<ReportRow>`
			select * from report where id = ${id} and uid = ${uid}`
		return row ? toView(row) : null
	}

	listNotes(): Array<NoteView> {
		return this.sql<NoteView>`select id, text, created_at from note order by id`
	}

	forgetNote(id: number) {
		this.sql`delete from note where id = ${id}`
	}

	// Runs from the schedule, so it outlives the request that checked in.
	// It never throws: a failed run is recorded on the report, and a retry
	// would pay for the whole model loop again.
	async writeReport({ reportId }: { reportId: string }) {
		const [report] = this
			.sql<ReportRow>`select * from report where id = ${reportId}`
		if (!report || report.status !== 'writing') return
		const db = connect(this.env.HYPERDRIVE)
		try {
			const body = await this.runModel(report, db)
			this.sql`
				update report set status = 'done', body = ${body},
					finished_at = ${new Date().toISOString()}
				where id = ${reportId}`
		} catch (error) {
			console.error('reporter run failed', error)
			const message = error instanceof Error ? error.message : String(error)
			this.sql`
				update report set status = 'failed', error = ${message},
					finished_at = ${new Date().toISOString()}
				where id = ${reportId}`
		} finally {
			await db.end({ timeout: 5 })
		}
	}

	private async runModel(report: ReportRow, db: ReturnType<typeof connect>) {
		const [previous] = this.sql<{ body: string }>`
			select body from report
			where uid = ${report.uid} and status = 'done' and id != ${report.id}
			order by created_at desc limit 1`
		// A broken GitHub setup costs the report its GitHub tools, not the
		// report itself.
		let github: ReturnType<typeof githubFor> = null
		let githubProblem: string | null = null
		try {
			github = githubFor(this.env)
		} catch (error) {
			githubProblem = error instanceof Error ? error.message : String(error)
		}
		const ai = createAI({ binding: this.env.AI })
		const result = await generateText({
			model: ai(this.env.REPORTER_MODEL),
			instructions: REPORTER_SYSTEM_PROMPT,
			prompt: reporterUserMessage({
				adminEmail: report.email,
				since: report.since,
				until: report.until,
				isFirstReport: !previous,
				notes: this.listNotes(),
				previousReport: previous?.body ?? null,
				githubProblem,
			}),
			tools: {
				...this.tools(db),
				...(github ? this.githubTools(github, db, report.id) : {}),
			},
			stopWhen: isStepCount(MAX_STEPS),
		})
		const body = result.text.trim()
		if (!body) {
			throw new Error(
				`The model finished without writing a report (finish reason: ${result.finishReason}).`
			)
		}
		return body
	}

	private tools(db: ReturnType<typeof connect>) {
		return {
			activity_between: tool({
				description:
					'Everything that happened on Sunlo in a time window: signups (with usernames and whether they onboarded), active users, reviews and each reviewer, new decks, phrases added to decks, library counts and friend chat volume. Use it first, for the report window.',
				inputSchema: z.object({
					since: z.string().describe('Window start, ISO 8601, inclusive'),
					until: z.string().describe('Window end, ISO 8601, exclusive'),
				}),
				execute: async ({ since, until }) =>
					JSON.stringify(await activityBetween(db, since, until)),
			}),
			run_sql: tool({
				description: `Run one read-only Postgres SELECT (a WITH clause is fine) and get the rows as JSON. At most 200 rows; 8-second timeout. Use it for follow-up questions that activity_between does not answer.`,
				inputSchema: z.object({
					query: z.string().describe('One SELECT statement, no semicolons'),
				}),
				execute: async ({ query }) => {
					try {
						return await runReadOnlyQuery(db, query)
					} catch (error) {
						if (error instanceof QueryRejectedError) throw error
						const message =
							error instanceof Error ? error.message : String(error)
						throw new Error(`The query failed: ${message}`, { cause: error })
					}
				},
			}),
			remember: tool({
				description:
					'Save a durable fact for future reports, such as which account is a test account. Never save numbers a query can recompute.',
				inputSchema: z.object({ note: z.string().min(1).max(500) }),
				execute: ({ note }) => {
					const [saved] = this.sql<{ id: number }>`
						insert into note (text, created_at)
						values (${note}, ${new Date().toISOString()})
						returning id`
					return Promise.resolve(`Saved as note ${saved.id}.`)
				},
			}),
			forget: tool({
				description:
					'Delete one of your saved notes, by its number, when it is wrong or out of date.',
				inputSchema: z.object({ id: z.number().int() }),
				execute: ({ id }) => {
					this.forgetNote(id)
					return Promise.resolve(`Forgot note ${id}.`)
				},
			}),
		}
	}

	private githubTools(
		github: NonNullable<ReturnType<typeof githubFor>>,
		db: ReturnType<typeof connect>,
		reportId: string
	) {
		let people: Promise<PeopleIndex> | undefined
		let issuesThisRun = 0
		let commentsThisRun = 0
		const rejectPersonalData = async (text: string) => {
			people ??= loadPeople(db)
			const found = findPersonalData(text, await people)
			if (found) {
				throw new Error(
					`The text contains ${found}. The repository is public, so describe counts and patterns without identifying anyone, then try again.`
				)
			}
		}
		const footer = `\n\n---\n_Filed by the Sunlo usage reporter._`

		return {
			list_my_issues: tool({
				description:
					'List the GitHub issues you filed in earlier runs, with whether each is still open. Call it before filing, so you comment on an open issue instead of filing a duplicate.',
				inputSchema: z.object({}),
				execute: async () => {
					const filed = this.sql<{
						number: number
						title: string
						url: string
						created_at: string
					}>`
						select number, title, url, created_at from filed_issue
						order by created_at desc limit 20`
					const states = await Promise.all(
						filed.map((issue) =>
							github.issueState(issue.number).catch(() => 'unknown')
						)
					)
					return JSON.stringify(
						filed.map(({ number, title, url, created_at }, index) => ({
							number,
							title,
							url,
							created_at,
							state: states.at(index),
						}))
					)
				},
			}),
			file_issue: tool({
				description: `File a GitHub issue on Sunlo's public repository for something that looks broken in the product or the data. At most ${ISSUES_PER_RUN} per run and ${ISSUES_PER_DAY} per day. The text must not identify any user: no emails, usernames or user ids.`,
				inputSchema: z.object({
					title: z.string().min(5).max(120),
					body: z.string().min(20).max(6000),
				}),
				execute: async ({ title, body }) => {
					if (issuesThisRun >= ISSUES_PER_RUN) {
						throw new Error(
							`You have filed ${ISSUES_PER_RUN} issues in this run, the limit. Mention the rest in the report instead.`
						)
					}
					const since = new Date(Date.now() - 86_400_000).toISOString()
					const [{ today }] = this.sql<{ today: number }>`
						select count(*) as today from filed_issue where created_at >= ${since}`
					if (today >= ISSUES_PER_DAY) {
						throw new Error(
							`${ISSUES_PER_DAY} issues were filed in the last 24 hours, the limit. Mention this one in the report instead.`
						)
					}
					await rejectPersonalData(`${title}\n${body}`)
					const issue = await github.fileIssue(title, body + footer)
					issuesThisRun += 1
					this.sql`
						insert into filed_issue (number, title, url, report_id, created_at)
						values (${issue.number}, ${issue.title}, ${issue.url}, ${reportId}, ${new Date().toISOString()})`
					return `Filed issue #${issue.number}: ${issue.url}`
				},
			}),
			comment_on_issue: tool({
				description: `Add new evidence to an issue you filed earlier, instead of filing a duplicate. At most ${COMMENTS_PER_RUN} per run. Same rule: no emails, usernames or user ids.`,
				inputSchema: z.object({
					number: z.number().int(),
					body: z.string().min(20).max(4000),
				}),
				execute: async ({ number, body }) => {
					const [mine] = this.sql<{ number: number }>`
						select number from filed_issue where number = ${number}`
					if (!mine) {
						throw new Error(
							`Issue #${number} was not filed by you. Comment only on issues from list_my_issues.`
						)
					}
					if (commentsThisRun >= COMMENTS_PER_RUN) {
						throw new Error(
							`You have commented ${COMMENTS_PER_RUN} times in this run, the limit.`
						)
					}
					await rejectPersonalData(body)
					const url = await github.commentOnIssue(number, body + footer)
					commentsThisRun += 1
					return `Commented: ${url}`
				},
			}),
		}
	}
}

async function loadPeople(db: ReturnType<typeof connect>) {
	const rows = await db<Array<{ uid: string; username: string | null }>>`
		select uid::text, lower(username) as username from public.user_profile`
	const people: PeopleIndex = { usernames: new Set(), uids: new Set() }
	for (const row of rows) {
		people.uids.add(row.uid.toLowerCase())
		if (row.username) people.usernames.add(row.username)
	}
	return people
}

function toView(row: ReportRow): ReportView {
	return {
		id: row.id,
		since: row.since,
		until: row.until,
		status: row.status,
		body: row.body,
		error: row.error,
		created_at: row.created_at,
		finished_at: row.finished_at,
	}
}
