import {
	PAINTINGS_PER_HOUR,
	SVGS_PER_HOUR,
	type CrewKey,
	type PainterStyleType,
} from '../../shared/crew'
import { checkPaintRequest } from '../painter'

// The room's `sql` template (the Agents SDK's), so the tests can run these
// against node:sqlite.
export type Sql = <T>(
	strings: TemplateStringsArray,
	...values: Array<string | number | boolean | null>
) => Array<T>

// A paint call reserves its paintings with this error, which its post
// replaces; a call that died before posting leaves it.
export const UNPOSTED =
	'The paint call stopped before this painting was posted.'

// Paintings and SVG renderings older than this go, unless something still
// points at them (pruneImages).
export const IMAGE_KEEP_DAYS = 30

const HOUR = 3_600_000

// Reserved and posted paintings both count, so a paint call that died
// after its models ran still counts.
export function paintingsLeft(sql: Sql, agent: CrewKey, at = Date.now()) {
	const hourAgo = new Date(at - HOUR).toISOString()
	const [{ made }] = sql<{ made: number }>`
		select count(*) as made from painting
		where agent = ${agent} and at > ${hourAgo}`
	return Math.max(0, PAINTINGS_PER_HOUR - made)
}

// Checks a paint call and holds a painting row for each style before any
// model runs. It must stay synchronous: with no await between the check and
// the inserts, paint calls made in parallel cannot take the same paintings.
export function reservePaintings(
	sql: Sql,
	input: {
		agent: CrewKey
		styles: Array<string>
		references: number
		known: Array<PainterStyleType>
		at?: number
	}
):
	| {
			ok: true
			paintings: Array<{ id: number; label: string; style: PainterStyleType }>
	  }
	| { ok: false; error: string } {
	const at = input.at ?? Date.now()
	const checked = checkPaintRequest({
		names: input.styles,
		known: input.known,
		left: paintingsLeft(sql, input.agent, at),
		references: input.references,
	})
	if (!checked.ok) return checked
	const stamp = new Date(at).toISOString()
	const paintings = checked.styles.map((style, index) => {
		const label = String.fromCharCode(65 + index)
		const [{ id }] = sql<{ id: number }>`
			insert into painting (agent, label, style, model, prompt, error, at)
			values (${input.agent}, ${label}, ${style.name}, ${style.model}, '', ${UNPOSTED}, ${stamp})
			returning id`
		return { id, label, style }
	})
	return { ok: true, paintings }
}

export function svgsLeft(sql: Sql, agent: CrewKey, at = Date.now()) {
	const hourAgo = new Date(at - HOUR).toISOString()
	const [{ made }] = sql<{ made: number }>`
		select count(*) as made from svg
		where author = ${agent} and at > ${hourAgo}
		and id not in (select svg from painting where svg is not null)`
	return Math.max(0, SVGS_PER_HOUR - made)
}

// Deletes paintings, their SVGs and SVG renderings older than
// IMAGE_KEEP_DAYS, unless the admin went with the painting, a message
// carries the image, or a style keeps it as an example. A card that showed
// one shows an empty frame. The admin's uploads, sketches and the SVGs
// product-2 drew stay.
export function pruneImages(sql: Sql, at = Date.now()) {
	const cutoff = new Date(at - IMAGE_KEEP_DAYS * 24 * HOUR).toISOString()
	const picked = sql<{ image: number | null; svg: number | null }>`
		select p.image, p.svg from message m
		join painting p on json_extract(m.answer, '$.actionId') = 'painting-' || p.id
		where m.answer like '%"actionId":"painting-%'`
	const pickedSvgs = new Set(picked.flatMap((p) => (p.svg ? [p.svg] : [])))
	const kept = new Set<number>([
		...picked.flatMap((p) => (p.image ? [p.image] : [])),
		...sql<{ id: number; png: number }>`
			select id, png from svg where png is not null`
			.filter((row) => pickedSvgs.has(row.id))
			.map((row) => row.png),
		...sql<{ id: number }>`
			select json_extract(j.value, '$.id') as id
			from message m, json_each(m.images) j where m.images is not null`.map(
			(row) => row.id
		),
		...sql<{ id: number }>`
			select json_extract(j.value, '$.id') as id
			from painter_style s, json_each(s.examples) j`.map((row) => row.id),
	])
	const svgs = sql<{ id: number }>`
		select v.id from svg v join painting p on p.svg = v.id
		where v.at < ${cutoff}`.filter((row) => !pickedSvgs.has(row.id))
	for (const { id } of svgs) sql`delete from svg where id = ${id}`
	const images = sql<{ id: number }>`
		select id from image
		where kind in ('painting', 'svg') and at < ${cutoff}`.filter(
		(row) => !kept.has(row.id)
	)
	for (const { id } of images) {
		sql`delete from image_part where image = ${id}`
		sql`delete from image where id = ${id}`
	}
	return {
		images: images.map((row) => row.id),
		svgs: svgs.map((row) => row.id),
	}
}
