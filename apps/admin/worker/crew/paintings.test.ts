import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { PAINTINGS_PER_HOUR, type PainterStyleType } from '../../shared/crew'
import {
	paintingsLeft,
	pruneImages,
	reservePaintings,
	svgsLeft,
	UNPOSTED,
	type Sql,
} from './paintings'

// The tables these read, as the room creates them.
function room() {
	const db = new DatabaseSync(':memory:')
	db.exec(`
		create table message (id text primary key, answer text, images text);
		create table image (
			id integer primary key autoincrement, kind text not null,
			author text not null, mime_type text not null, width integer not null,
			height integer not null, bytes blob not null, at text not null
		);
		create table image_part (
			image integer not null, part integer not null, bytes blob not null,
			primary key (image, part)
		);
		create table painter_style (
			id integer primary key autoincrement, name text not null,
			examples text not null default '[]'
		);
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

const style = (name: string): PainterStyleType => ({
	id: 1,
	name,
	description: '',
	prompt: `${name} prompt`,
	model: 'black-forest-labs/flux-3-image-klein',
	examples: [],
	at: '',
})
const known = ['A', 'B', 'C', 'D'].map(style)
const now = Date.parse('2026-10-30T12:00:00Z')
const day = 86_400_000

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

describe('pruneImages', () => {
	it('deletes old paintings and renderings nothing points at', () => {
		const { sql } = room()
		const old = new Date(now - 31 * day).toISOString()
		const recent = new Date(now - 29 * day).toISOString()
		const image = (kind: string, at: string) =>
			sql<{ id: number }>`
				insert into image (kind, author, mime_type, width, height, bytes, at)
				values (${kind}, 'product-2', 'image/png', 1, 1, x'00', ${at})
				returning id`[0].id
		const oldPainting = image('painting', old)
		const pickedPainting = image('painting', old)
		const inMessage = image('painting', old)
		const example = image('painting', old)
		const recentPainting = image('painting', recent)
		const upload = image('upload', old)
		const oldRendering = image('svg', old)
		const pickedRendering = image('svg', old)
		sql`insert into image_part (image, part, bytes) values (${oldPainting}, 0, x'00')`
		const svg = (png: number) =>
			sql<{ id: number }>`
				insert into svg (author, title, text, width, height, png, at)
				values ('product-2', 't', '<svg/>', 1, 1, ${png}, ${old})
				returning id`[0].id
		const unpickedVector = svg(oldRendering)
		const pickedVector = svg(pickedRendering)
		const painting = (image: number | null, svgId: number | null) =>
			sql<{ id: number }>`
				insert into painting (agent, label, style, model, prompt, image, svg, at)
				values ('product-2', 'A', 's', 'm', '', ${image}, ${svgId}, ${old})
				returning id`[0].id
		painting(oldPainting, null)
		const picked = painting(pickedPainting, null)
		painting(null, unpickedVector)
		const pickedSvgPainting = painting(null, pickedVector)
		for (const [id, actionId] of [
			['m1', `painting-${picked}`],
			['m2', `painting-${pickedSvgPainting}`],
		]) {
			const answer = JSON.stringify({ actionId, label: 'Go with A' })
			sql`insert into message (id, answer) values (${id}, ${answer})`
		}
		const images = JSON.stringify([{ id: inMessage, width: 1, height: 1 }])
		sql`insert into message (id, images) values ('m3', ${images})`
		const examples = JSON.stringify([{ id: example, width: 1, height: 1 }])
		sql`insert into painter_style (name, examples) values ('x', ${examples})`

		expect(pruneImages(sql, now)).toEqual({
			images: [oldPainting, oldRendering],
			svgs: [unpickedVector],
		})
		const left = sql<{ id: number }>`select id from image order by id`.map(
			(row) => row.id
		)
		expect(left).toEqual([
			pickedPainting,
			inMessage,
			example,
			recentPainting,
			upload,
			pickedRendering,
		])
		expect(sql`select * from image_part`).toEqual([])
		expect(
			sql<{ id: number }>`select id from svg`.map((row) => row.id)
		).toEqual([pickedVector])
	})
})
