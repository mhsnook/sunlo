import { defineTool } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import type { Sql } from 'postgres'
import * as v from 'valibot'
import { connect, withDeadline } from '../../worker/db'
import {
	activityBetween,
	QueryRejectedError,
	runReadOnlyQuery,
} from '../../worker/crew/queries'

async function withSql<T>(run: (sql: Sql) => Promise<T>) {
	const sql = connect(env.HYPERDRIVE)
	try {
		return await withDeadline(run(sql), 20_000, 'The database')
	} finally {
		await sql.end({ timeout: 5 })
	}
}

const Timestamp = v.pipe(
	v.string(),
	v.check((value) => !Number.isNaN(Date.parse(value)), 'Use an ISO 8601 time')
)

export const activityBetweenTool = defineTool({
	name: 'activity_between',
	description:
		'What happened on Sunlo between two times: signups (and whether each picked a username), reviews and each reviewer, new decks, phrases added to decks, and library and chat counts. Times are ISO 8601 in UTC; the window includes `since` and excludes `until`.',
	input: v.object({ since: Timestamp, until: Timestamp }),
	annotations: { readOnlyHint: true },
	timeoutMs: 30_000,
	async run({ data }) {
		const result = await withSql((sql) =>
			activityBetween(sql, data.since, data.until)
		)
		return JSON.stringify(result)
	},
})

export const runSqlTool = defineTool({
	name: 'run_sql',
	description:
		'Run one read-only SELECT against the Sunlo database, as a role that cannot write. 8-second timeout, at most 200 rows. Keep queries small and aggregate where you can.',
	input: v.object({ query: v.pipe(v.string(), v.minLength(1)) }),
	annotations: { readOnlyHint: true },
	timeoutMs: 30_000,
	async run({ data }) {
		try {
			return await withSql((sql) => runReadOnlyQuery(sql, data.query))
		} catch (error) {
			if (error instanceof QueryRejectedError) throw error
			// Postgres errors (a typo, a missing column) are for the model to
			// read and fix, so pass the message through.
			throw new Error(
				`The query failed: ${error instanceof Error ? error.message : String(error)}`,
				{ cause: error }
			)
		}
	},
})

export const DATABASE_NOTES = `## The database (Postgres, read-only)

- admin.user_account: id, email, created_at, last_sign_in_at. Use this view; auth.users is not readable.
- public.user_profile: uid, username, created_at, languages_known (jsonb). A null username means the person has not finished onboarding.
- public.user_deck: uid, lang (3-letter code), created_at, archived, daily_review_goal, learning_goal.
- public.user_card: uid, phrase_id, lang, status ('active' | 'learned' | 'skipped'), direction ('forward' | 'reverse'), created_at. Each phrase usually has two cards, one per direction.
- public.user_card_review: uid, phrase_id, lang, direction, score, created_at, day_session (the app's review day, which starts at 4am local time).
- public.user_review_session: uid, lang, day_session, created_at.
- public.phrase: id, text, lang, added_by, created_at, archived, draft. public.phrase_translation: id, phrase_id, text, lang, added_by, created_at.
- public.phrase_request: id, requester_uid, lang, prompt, created_at, deleted. public.request_comment: id, request_id, uid, content, created_at.
- public.phrase_playlist: id, uid, title, lang, created_at, deleted.
- public.chat_message: id, sender_uid, created_at. Message content is not readable.
- public.language: lang, name.`
