import type { Sql } from 'postgres'
import type {
	FeedbackItemType,
	FeedbackKind,
	FeedbackTriageType,
} from '../shared/feedback'

export type FeedbackRowType = Omit<FeedbackItemType, 'triage'>

export type FeedbackFilter = {
	kind: FeedbackKind | null
	// The ids the crew has triaged, from the CrewRoom.
	triaged: Array<string>
	untriagedOnly: boolean
	// The crew never gets a sender's email: only the admin replies to one.
	withEmail: boolean
	limit: number
}

// The ids go in as one JSON array, because the connection skips fetching
// Postgres types (db.ts), so postgres.js cannot send a uuid[] parameter.
export async function feedbackRows(sql: Sql, filter: FeedbackFilter) {
	const triaged = JSON.stringify(filter.triaged)
	const exclude = filter.untriagedOnly ? triaged : '[]'
	const rows = await sql<Array<FeedbackRowType>>`
		select
			f.id::text as id,
			to_json(f.created_at) #>> '{}' as created_at,
			f.kind,
			f.message,
			f.lang,
			f.page_url,
			pr.username,
			f.uid is not null as signed_in,
			case when ${filter.withEmail} then f.contact_email end as contact_email,
			f.contact_email is not null as left_email
		from public.feedback f
		left join public.user_profile pr on pr.uid = f.uid
		where (${filter.kind}::text is null or f.kind = ${filter.kind})
			and f.id::text not in (select jsonb_array_elements_text(${exclude}::jsonb))
		order by f.created_at desc
		limit ${filter.limit}`
	const [{ untriaged }] = await sql<[{ untriaged: number }]>`
		select count(*)::int as untriaged from public.feedback f
		where f.id::text not in (select jsonb_array_elements_text(${triaged}::jsonb))`
	return { rows, untriaged }
}

export function withTriage(
	rows: Array<FeedbackRowType>,
	triage: Array<FeedbackTriageType>
): Array<FeedbackItemType> {
	const byId = new Map(triage.map((t) => [t.feedback_id, t]))
	return rows.map((row) => ({ ...row, triage: byId.get(row.id) ?? null }))
}
