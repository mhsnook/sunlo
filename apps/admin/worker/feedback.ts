import type { SupabaseClient } from '@supabase/supabase-js'
import type { Sql } from 'postgres'
import { z } from 'zod'
import type {
	FeedbackItemType,
	FeedbackKind,
	FeedbackTriageType,
} from '../shared/feedback'

// A feedback row comes in two halves. admin_reader reads the columns that
// counting needs; the text (message, page, email) is hidden from it, because
// it also runs the agents' own SQL, so the admin's session reads that half
// through RLS.

export type FeedbackMetaType = Pick<
	FeedbackItemType,
	'id' | 'created_at' | 'kind' | 'lang' | 'username' | 'signed_in'
>

export type FeedbackFilter = {
	kind: FeedbackKind | null
	// The ids the crew has triaged, from the CrewRoom.
	triaged: Array<string>
	untriagedOnly: boolean
	limit: number
}

// The ids go in as one JSON array, because the connection skips fetching
// Postgres types (db.ts), so postgres.js cannot send a uuid[] parameter.
export async function feedbackMeta(sql: Sql, filter: FeedbackFilter) {
	const triaged = JSON.stringify(filter.triaged)
	const exclude = filter.untriagedOnly ? triaged : '[]'
	const rows = await sql<Array<FeedbackMetaType>>`
		select
			f.id::text as id,
			to_json(f.created_at) #>> '{}' as created_at,
			f.kind,
			f.lang,
			pr.username,
			f.uid is not null as signed_in
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

const FeedbackTextSchema = z.object({
	id: z.string(),
	message: z.string(),
	page_url: z.string().nullable(),
	contact_email: z.string().nullable(),
})
export type FeedbackTextType = z.infer<typeof FeedbackTextSchema>

// `admin` must be a client signed in as an admin: RLS returns nothing to
// anyone else.
export async function feedbackTexts(
	admin: SupabaseClient,
	ids: Array<string>
): Promise<Array<FeedbackTextType>> {
	if (!ids.length) return []
	const { data, error } = await admin
		.from('feedback')
		.select('id, message, page_url, contact_email')
		.in('id', ids)
	if (error) throw new Error(`Could not read feedback: ${error.message}`)
	return z.array(FeedbackTextSchema).parse(data)
}

export function joinFeedback(
	meta: Array<FeedbackMetaType>,
	texts: Array<FeedbackTextType>,
	triage: Array<FeedbackTriageType>,
	options: { withEmail: boolean }
): Array<FeedbackItemType> {
	const textOf = new Map(texts.map((t) => [t.id, t]))
	const triageOf = new Map(triage.map((t) => [t.feedback_id, t]))
	return meta.map((row) => {
		const text = textOf.get(row.id)
		const email = text?.contact_email ?? null
		return {
			...row,
			message: text?.message ?? '',
			page_url: text?.page_url ?? null,
			contact_email: options.withEmail ? email : null,
			left_email: email !== null,
			triage: triageOf.get(row.id) ?? null,
		}
	})
}
