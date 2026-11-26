import { Buffer } from 'node:buffer'
import type { ImageMimeType, MessageImageType } from '../../shared/crew'
import { HOUR } from './hourly'

// The room's `storage.sql.exec`, which binds an ArrayBuffer as a blob (the
// `sql` template takes no bytes). The tests pass node:sqlite's.
export type Exec = <T>(
	query: string,
	...bindings: Array<string | number | null | ArrayBuffer>
) => Array<T>

// One image_part row's bytes: a Durable Object row holds at most 2 MB,
// bytes and every other column.
const PART_BYTES = 1_800_000

// Paintings and SVG renderings older than this go, unless something still
// points at them (pruneImages).
export const IMAGE_KEEP_DAYS = 30

export type ImageKind = 'upload' | 'painting' | 'svg' | 'sketch'

// SQLite binds a whole ArrayBuffer, so a view over part of one is copied.
const exactBuffer = (bytes: Uint8Array): ArrayBuffer =>
	bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
		? (bytes.buffer as ArrayBuffer)
		: bytes.slice().buffer

// One picture, kept by id. A picture over one row's limit goes into
// image_part in pieces, with an empty `bytes` in its image row.
export function saveImage(
	exec: Exec,
	input: {
		kind: ImageKind
		author: string
		mimeType: ImageMimeType
		width: number
		height: number
		bytes: ArrayBuffer | Uint8Array
		at: string
	}
): MessageImageType {
	const bytes =
		input.bytes instanceof Uint8Array
			? input.bytes
			: new Uint8Array(input.bytes)
	const split = bytes.byteLength > PART_BYTES
	const [{ id }] = exec<{ id: number }>(
		`insert into image (kind, author, mime_type, width, height, bytes, at)
		values (?, ?, ?, ?, ?, ?, ?)
		returning id`,
		input.kind,
		input.author,
		input.mimeType,
		input.width,
		input.height,
		split ? new ArrayBuffer(0) : exactBuffer(bytes),
		input.at
	)
	if (split) {
		for (let part = 0; part * PART_BYTES < bytes.byteLength; part++) {
			exec(
				'insert into image_part (image, part, bytes) values (?, ?, ?)',
				id,
				part,
				exactBuffer(bytes.subarray(part * PART_BYTES, (part + 1) * PART_BYTES))
			)
		}
	}
	return { id, width: input.width, height: input.height }
}

export function loadImage(exec: Exec, id: number) {
	const [row] = exec<{
		bytes: ArrayBuffer
		mime_type: ImageMimeType
		width: number
		height: number
	}>('select bytes, mime_type, width, height from image where id = ?', id)
	if (!row) return null
	const bytes = row.bytes.byteLength
		? row.bytes
		: exactBuffer(
				Buffer.concat(
					exec<{ bytes: ArrayBuffer }>(
						'select bytes from image_part where image = ? order by part',
						id
					).map((part) => new Uint8Array(part.bytes))
				)
			)
	return {
		bytes,
		mimeType: row.mime_type,
		width: row.width,
		height: row.height,
	}
}

// The paintings the admin went with. An action id is "painting-<id>".
const PICKED = `
	select p.image, p.svg from message m
	join painting p
		on p.id = cast(substr(json_extract(m.answer, '$.actionId'), 10) as integer)
	where m.answer like '%"actionId":"painting-%'`

// Deletes paintings, their SVGs and SVG renderings older than
// IMAGE_KEEP_DAYS, unless the admin went with the painting, a message
// carries the image, or a style keeps it as an example. A card that showed
// one shows an empty frame. The admin's uploads, sketches and the SVGs
// product-2 drew stay.
export function pruneImages(exec: Exec, at = Date.now()) {
	const cutoff = new Date(at - IMAGE_KEEP_DAYS * 24 * HOUR).toISOString()
	const svgs = exec<{ id: number }>(
		`select v.id from svg v join painting p on p.svg = v.id
		where v.at < ?
		and v.id not in (select svg from (${PICKED}) where svg is not null)
		order by v.id`,
		cutoff
	).map((row) => row.id)
	const images = exec<{ id: number }>(
		`select id from image
		where kind in ('painting', 'svg') and at < ?
		and id not in (select image from (${PICKED}) where image is not null)
		and id not in (
			select png from svg
			where png is not null
			and id in (select svg from (${PICKED}) where svg is not null)
		)
		and id not in (
			select json_extract(j.value, '$.id')
			from message m, json_each(m.images) j where m.images is not null
		)
		and id not in (
			select json_extract(j.value, '$.id')
			from painter_style s, json_each(s.examples) j
		)
		order by id`,
		cutoff
	).map((row) => row.id)
	const svgIds = JSON.stringify(svgs)
	const imageIds = JSON.stringify(images)
	exec('delete from svg where id in (select value from json_each(?))', svgIds)
	exec(
		'delete from image_part where image in (select value from json_each(?))',
		imageIds
	)
	exec(
		'delete from image where id in (select value from json_each(?))',
		imageIds
	)
	return { images, svgs }
}
