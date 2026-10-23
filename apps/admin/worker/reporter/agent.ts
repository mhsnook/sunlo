import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { ToolError } from '@anthropic-ai/sdk/lib/tools/ToolError'
import { Agent } from 'agents'
import { z } from 'zod'
import { connect } from '../db'
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
		const db = connect(this.env.ADMIN_DATABASE_URL)
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
		if (!this.env.ANTHROPIC_API_KEY) {
			throw new Error('ANTHROPIC_API_KEY is not set on this Worker')
		}
		const client = new Anthropic({ apiKey: this.env.ANTHROPIC_API_KEY })
		const message = await client.beta.messages.toolRunner({
			model: 'claude-opus-5-5',
			max_tokens: 16000,
			max_iterations: 15,
			thinking: { type: 'adaptive' },
			output_config: { effort: 'high' },
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			cache_control: { type: 'ephemeral' },
			system: REPORTER_SYSTEM_PROMPT,
			tools: this.tools(db),
			messages: [
				{
					role: 'user',
					content: reporterUserMessage({
						adminEmail: report.email,
						since: report.since,
						until: report.until,
						isFirstReport: !previous,
						notes: this.listNotes(),
						previousReport: previous?.body ?? null,
					}),
				},
			],
		})
		if (message.stop_reason === 'refusal') {
			throw new Error('The model declined to write this report.')
		}
		const body = message.content
			.flatMap((block) => (block.type === 'text' ? [block.text] : []))
			.join('\n\n')
			.trim()
		if (!body) {
			throw new Error(
				`The model finished without writing a report (stop reason: ${message.stop_reason}).`
			)
		}
		return body
	}

	private tools(db: ReturnType<typeof connect>) {
		return [
			betaZodTool({
				name: 'activity_between',
				description:
					'Everything that happened on Sunlo in a time window: signups (with usernames and whether they onboarded), active users, reviews and each reviewer, new decks, phrases added to decks, library counts and friend chat volume. Use it first, for the report window.',
				inputSchema: z.object({
					since: z.string().describe('Window start, ISO 8601, inclusive'),
					until: z.string().describe('Window end, ISO 8601, exclusive'),
				}),
				run: async ({ since, until }) =>
					JSON.stringify(await activityBetween(db, since, until)),
			}),
			betaZodTool({
				name: 'run_sql',
				description: `Run one read-only Postgres SELECT (a WITH clause is fine) and get the rows as JSON. At most 200 rows; 8-second timeout. Use it for follow-up questions that activity_between does not answer.`,
				inputSchema: z.object({
					query: z.string().describe('One SELECT statement, no semicolons'),
				}),
				run: async ({ query }) => {
					try {
						return await runReadOnlyQuery(db, query)
					} catch (error) {
						if (error instanceof QueryRejectedError)
							throw new ToolError(error.message)
						const message =
							error instanceof Error ? error.message : String(error)
						throw new ToolError(`The query failed: ${message}`)
					}
				},
			}),
			betaZodTool({
				name: 'remember',
				description:
					'Save a durable fact for future reports, such as which account is a test account. Never save numbers a query can recompute.',
				inputSchema: z.object({ note: z.string().min(1).max(500) }),
				run: ({ note }) => {
					const [saved] = this.sql<{ id: number }>`
						insert into note (text, created_at)
						values (${note}, ${new Date().toISOString()})
						returning id`
					return Promise.resolve(`Saved as note ${saved.id}.`)
				},
			}),
			betaZodTool({
				name: 'forget',
				description:
					'Delete one of your saved notes, by its number, when it is wrong or out of date.',
				inputSchema: z.object({ id: z.number().int() }),
				run: ({ id }) => {
					this.forgetNote(id)
					return Promise.resolve(`Forgot note ${id}.`)
				},
			}),
		]
	}
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
