import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { PAINTINGS_PER_HOUR } from '../../shared/crew'
import {
	paintingsLeft,
	reservePaintings,
	svgsLeft,
	UNPOSTED,
	type PaintStyle,
	type Sql,
} from './paintings'

// The tables these read, as the room creates them.
function room() {
	const db = new DatabaseSync(':memory:')
	db.exec(`
		create table painting (
			id integer primary key autoincrement, agent text not null,
			label text not null, style text not null, model text not null,
			prompt text not null, image integer, svg integer, error text,
			at text not null
		);
		create table svg (
			id integer primary key autoincrement, author text not null,
			title text not null, text text not null, width real not null,
			height real not null, png integer, at text not null
		);
	`)
	const sql: Sql = <T>(
		strings: TemplateStringsArray,
		...values: Array<string | number | boolean | null>
	) =>
		db
			.prepare(strings.join('?'))
			.all(
				...values.map((value) =>
					typeof value === 'boolean' ? Number(value) : value
				)
			) as Array<T>
	return { db, sql }
}

const style = (name: string): PaintStyle => ({
	name,
	prompt: `${name} prompt`,
	model: 'black-forest-labs/flux-3-image-klein',
})
const known = ['A', 'B', 'C', 'D'].map(style)
const now = Date.parse('2026-10-30T12:00:00Z')

describe('reservePaintings', () => {
	it('lets paint calls made in parallel share the hour, not each take it', async () => {
		const { sql } = room()
		const call = () =>
			Promise.resolve().then(() =>
				reservePaintings(sql, {
					agent: 'product-2',
					styles: ['a', 'b', 'c', 'd'],
					references: 0,
					known,
					at: now,
				})
			)
		const results = await Promise.all([call(), call(), call(), call()])
		expect(results.filter((r) => r.ok)).toHaveLength(PAINTINGS_PER_HOUR / 4)
		expect(results.at(-1)).toEqual({
			ok: false,
			error: `Nothing was painted: you can have 0 more paintings this hour, out of ${PAINTINGS_PER_HOUR}.`,
		})
		expect(paintingsLeft(sql, 'product-2', now)).toBe(0)
	})

	it('holds a row per style that counts until the post fills it in', () => {
		const { sql } = room()
		const reserved = reservePaintings(sql, {
			agent: 'product-2',
			styles: ['b', 'a'],
			references: 0,
			known,
			at: now,
		})
		expect(reserved.ok && reserved.paintings.map((p) => p.label)).toEqual([
			'A',
			'B',
		])
		expect(reserved.ok && reserved.paintings[0].style.name).toBe('B')
		const rows = sql<{ error: string }>`select error from painting`
		expect(rows.map((row) => row.error)).toEqual([UNPOSTED, UNPOSTED])
		expect(paintingsLeft(sql, 'product-2', now)).toBe(PAINTINGS_PER_HOUR - 2)
		expect(paintingsLeft(sql, 'product-2', now + 3_600_001)).toBe(
			PAINTINGS_PER_HOUR
		)
	})

	it('reserves nothing for an unknown style', () => {
		const { sql } = room()
		const reserved = reservePaintings(sql, {
			agent: 'product-2',
			styles: ['a', 'nope'],
			references: 0,
			known,
			at: now,
		})
		expect(reserved.ok).toBe(false)
		expect(paintingsLeft(sql, 'product-2', now)).toBe(PAINTINGS_PER_HOUR)
	})
})

describe('svgsLeft', () => {
	it('counts the SVGs drawn this hour, not a vector model’s', () => {
		const { sql } = room()
		const at = new Date(now - 60_000).toISOString()
		sql`insert into svg (author, title, text, width, height, at) values ('product-2', 'a', '', 1, 1, ${at})`
		sql`insert into svg (author, title, text, width, height, at) values ('product-2', 'b', '', 1, 1, ${at})`
		sql`insert into painting (agent, label, style, model, prompt, svg, at) values ('product-2', 'A', 's', 'm', '', 2, ${at})`
		expect(svgsLeft(sql, 'product-2', now)).toBe(23)
	})
})
