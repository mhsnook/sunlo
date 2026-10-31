import {
	PAINTINGS_PER_HOUR,
	SVGS_PER_HOUR,
	type CrewKey,
	type PainterStyleType,
} from '../../shared/crew'
import { checkPaintRequest } from '../painter'
import { leftThisHour } from './hourly'
import { optionLabel } from './picks'

// The room's `sql` template (the Agents SDK's), so the tests can run these
// against node:sqlite.
export type Sql = <T>(
	strings: TemplateStringsArray,
	...values: Array<string | number | boolean | null>
) => Array<T>

export type PaintStyle = Pick<PainterStyleType, 'name' | 'model' | 'prompt'>

// A paint call reserves its paintings with this error, which its post
// replaces; a call that died before posting leaves it.
export const UNPOSTED =
	'The paint call stopped before this painting was posted.'

// Reserved and posted paintings both count, so a paint call that died
// after its models ran still counts.
export const paintingsLeft = (sql: Sql, agent: CrewKey, at = Date.now()) =>
	leftThisHour(
		PAINTINGS_PER_HOUR,
		(since) =>
			sql<{ made: number }>`
				select count(*) as made from painting
				where agent = ${agent} and at > ${since}`[0].made,
		at
	)

// Checks a paint call and holds a painting row for each style before any
// model runs. It must stay synchronous: with no await between the check and
// the inserts, paint calls made in parallel cannot take the same paintings.
export function reservePaintings(
	sql: Sql,
	input: {
		agent: CrewKey
		styles: Array<string>
		references: number
		known: Array<PaintStyle>
		at?: number
	}
):
	| {
			ok: true
			paintings: Array<{ id: number; label: string; style: PaintStyle }>
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
		const label = optionLabel(index)
		const [{ id }] = sql<{ id: number }>`
			insert into painting (agent, label, style, model, prompt, error, at)
			values (${input.agent}, ${label}, ${style.name}, ${style.model}, '', ${UNPOSTED}, ${stamp})
			returning id`
		return { id, label, style }
	})
	return { ok: true, paintings }
}

export const svgsLeft = (sql: Sql, agent: CrewKey, at = Date.now()) =>
	leftThisHour(
		SVGS_PER_HOUR,
		(since) =>
			sql<{ made: number }>`
				select count(*) as made from svg
				where author = ${agent} and at > ${since}
				and id not in (select svg from painting where svg is not null)`[0].made,
		at
	)
