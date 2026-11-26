import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { loadImage, pruneImages, saveImage, type Exec } from './image-store'

// The tables the store reads, as the room creates them.
function room() {
	const db = new DatabaseSync(':memory:')
	db.exec(`
		create table message (id text primary key, answer text, images text);
		create table image (
			id integer primary key autoincrement, kind text not null,
			author text not null, mime_type text not null, width integer not null,
			height integer not null, bytes blob, at text not null
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
	// Binds and returns blobs as ArrayBuffers, as storage.sql does; node:sqlite
	// takes and gives Uint8Arrays, and binds an empty one as null, so
	// image.bytes is nullable here and null reads back empty.
	const exec: Exec = <T>(
		query: string,
		...bindings: Array<string | number | null | ArrayBuffer>
	) =>
		db
			.prepare(query)
			.all(
				...bindings.map((value) =>
					value instanceof ArrayBuffer ? new Uint8Array(value) : value
				)
			)
			.map((row) =>
				Object.fromEntries(
					Object.entries(row).map(([key, value]) => [
						key,
						value instanceof Uint8Array
							? value.slice().buffer
							: key === 'bytes' && value === null
								? new ArrayBuffer(0)
								: value,
					])
				)
			) as Array<T>
	return { exec }
}

const bytesOf = (length: number) =>
	Uint8Array.from({ length }, (_, at) => at % 251)

const save = (exec: Exec, bytes: ArrayBuffer | Uint8Array, at = '') =>
	saveImage(exec, {
		kind: 'painting',
		author: 'product-2',
		mimeType: 'image/png',
		width: 4,
		height: 5,
		bytes,
		at,
	})

const partCount = (exec: Exec, id: number) =>
	exec<{ count: number }>(
		'select count(*) as count from image_part where image = ?',
		id
	)[0].count

describe('saveImage and loadImage', () => {
	it('keeps a picture in its row, or in parts past one row', () => {
		const { exec } = room()
		for (const [length, parts] of [
			[0, 0],
			[10, 0],
			[1_800_000, 0],
			[1_800_001, 2],
			[3_600_000, 2],
			[5_000_000, 3],
		]) {
			const bytes = bytesOf(length)
			const image = save(exec, bytes)
			expect(image).toEqual({ id: image.id, width: 4, height: 5 })
			expect(partCount(exec, image.id)).toBe(parts)
			const loaded = loadImage(exec, image.id)
			expect(loaded?.mimeType).toBe('image/png')
			expect(Buffer.from(loaded!.bytes).equals(bytes)).toBe(true)
		}
	})

	it('keeps only the bytes a view shows', () => {
		const { exec } = room()
		const whole = bytesOf(100)
		const image = save(exec, whole.subarray(10, 20))
		expect([...new Uint8Array(loadImage(exec, image.id)!.bytes)]).toEqual([
			...whole.subarray(10, 20),
		])
	})

	it('takes an ArrayBuffer too', () => {
		const { exec } = room()
		const image = save(exec, bytesOf(30).buffer)
		expect(loadImage(exec, image.id)!.bytes.byteLength).toBe(30)
	})

	it('finds no image for an unknown id', () => {
		expect(loadImage(room().exec, 9)).toBeNull()
	})
})

const now = Date.parse('2026-10-30T12:00:00Z')
const day = 86_400_000

describe('pruneImages', () => {
	it('deletes old paintings and renderings nothing points at', () => {
		const { exec } = room()
		const old = new Date(now - 31 * day).toISOString()
		const recent = new Date(now - 29 * day).toISOString()
		const image = (kind: string, at: string) =>
			exec<{ id: number }>(
				`insert into image (kind, author, mime_type, width, height, bytes, at)
				values (?, 'product-2', 'image/png', 1, 1, x'00', ?)
				returning id`,
				kind,
				at
			)[0].id
		const oldPainting = image('painting', old)
		const pickedPainting = image('painting', old)
		const inMessage = image('painting', old)
		const example = image('painting', old)
		const recentPainting = image('painting', recent)
		const upload = image('upload', old)
		const oldRendering = image('svg', old)
		const pickedRendering = image('svg', old)
		const bigPainting = save(exec, bytesOf(1_800_001), old).id
		const svg = (png: number) =>
			exec<{ id: number }>(
				`insert into svg (author, title, text, width, height, png, at)
				values ('product-2', 't', '<svg/>', 1, 1, ?, ?)
				returning id`,
				png,
				old
			)[0].id
		const unpickedVector = svg(oldRendering)
		const pickedVector = svg(pickedRendering)
		const painting = (image: number | null, svgId: number | null) =>
			exec<{ id: number }>(
				`insert into painting (agent, label, style, model, prompt, image, svg, at)
				values ('product-2', 'A', 's', 'm', '', ?, ?, ?)
				returning id`,
				image,
				svgId,
				old
			)[0].id
		painting(oldPainting, null)
		const picked = painting(pickedPainting, null)
		painting(null, unpickedVector)
		const pickedSvgPainting = painting(null, pickedVector)
		painting(bigPainting, null)
		for (const [id, actionId] of [
			['m1', `painting-${picked}`],
			['m2', `painting-${pickedSvgPainting}`],
			// A sketch pick with the same number picks no painting.
			['m4', `sketch-${painting(oldPainting, null)}`],
		]) {
			const answer = JSON.stringify({ actionId, label: 'Go with A' })
			exec('insert into message (id, answer) values (?, ?)', id, answer)
		}
		const images = JSON.stringify([{ id: inMessage, width: 1, height: 1 }])
		exec("insert into message (id, images) values ('m3', ?)", images)
		const examples = JSON.stringify([{ id: example, width: 1, height: 1 }])
		exec("insert into painter_style (name, examples) values ('x', ?)", examples)

		expect(pruneImages(exec, now)).toEqual({
			images: [oldPainting, oldRendering, bigPainting],
			svgs: [unpickedVector],
		})
		const left = exec<{ id: number }>('select id from image order by id').map(
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
		expect(exec('select * from image_part')).toEqual([])
		expect(
			exec<{ id: number }>('select id from svg').map((row) => row.id)
		).toEqual([pickedVector])
	})
})
