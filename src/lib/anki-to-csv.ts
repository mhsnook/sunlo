import initSqlJs, { type Database } from 'sql.js'
import { unzipSync } from 'fflate'

export type AnkiNote = {
	fields: Array<string>
	modelId: number
}

export type AnkiDeckData = {
	notes: Array<AnkiNote>
	fieldNames: Array<string>
	deckName: string
}

function stripHtml(text: string): string {
	return text
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim()
}

function extractDb(apkgBuffer: ArrayBuffer): Uint8Array {
	const files = unzipSync(new Uint8Array(apkgBuffer))
	for (const name of ['collection.anki21', 'collection.anki2']) {
		if (files[name]) return files[name]
	}
	const names = Object.keys(files).join(', ')
	throw new Error(`No collection database found in .apkg. Contents: ${names}`)
}

function getModelFieldNames(db: Database): Map<number, Array<string>> {
	const result = new Map<number, Array<string>>()

	// Try older format: models JSON in col table
	try {
		const rows = db.exec('SELECT models FROM col')
		if (rows.length > 0 && rows[0].values.length > 0) {
			const models = JSON.parse(rows[0].values[0][0] as string)
			for (const [mid, model] of Object.entries(models)) {
				const m = model as { flds: Array<{ name: string }> }
				result.set(
					Number(mid),
					m.flds.map((f) => f.name)
				)
			}
			return result
		}
	} catch {
		// Not the older format
	}

	// Try newer format: fields table
	try {
		const rows = db.exec('SELECT ntid, name FROM fields ORDER BY ntid, ord')
		if (rows.length > 0) {
			for (const [ntid, name] of rows[0].values) {
				const id = ntid as number
				if (!result.has(id)) result.set(id, [])
				result.get(id)!.push(name as string)
			}
			return result
		}
	} catch {
		// No fields table either
	}

	return result
}

function getDeckName(db: Database): string {
	try {
		const rows = db.exec('SELECT decks FROM col')
		if (rows.length > 0 && rows[0].values.length > 0) {
			const decks = JSON.parse(rows[0].values[0][0] as string)
			// Find the first non-default deck, or fall back to "Default"
			for (const deck of Object.values(decks)) {
				const d = deck as { name: string }
				if (d.name !== 'Default') return d.name
			}
			return 'Default'
		}
	} catch {
		// Newer schema or parse failure
	}
	return 'Anki Deck'
}

export async function parseAnkiDeck(
	apkgBuffer: ArrayBuffer
): Promise<AnkiDeckData> {
	const SQL = await initSqlJs({
		locateFile: () => '/sql-wasm.wasm',
	})

	const dbBytes = extractDb(apkgBuffer)
	const db = new SQL.Database(dbBytes)

	try {
		const fieldNamesMap = getModelFieldNames(db)
		const deckName = getDeckName(db)

		const rows = db.exec('SELECT mid, flds FROM notes')
		if (rows.length === 0 || rows[0].values.length === 0) {
			throw new Error('No notes found in the deck.')
		}

		const notes: Array<AnkiNote> = rows[0].values.map(([mid, flds]) => ({
			modelId: mid as number,
			fields: (flds as string).split('\x1f').map(stripHtml),
		}))

		// Determine column headers
		const modelIds = new Set(notes.map((n) => n.modelId))
		const maxFields = Math.max(...notes.map((n) => n.fields.length))

		let fieldNames: Array<string>
		if (modelIds.size === 1) {
			const mid = notes[0].modelId
			fieldNames = fieldNamesMap.get(mid) ?? []
		} else {
			fieldNames = []
		}
		// Pad with generic names if needed
		while (fieldNames.length < maxFields) {
			fieldNames.push(`Field${fieldNames.length + 1}`)
		}

		return { notes, fieldNames, deckName }
	} finally {
		db.close()
	}
}

export function notesToCsv(
	notes: Array<AnkiNote>,
	fieldNames: Array<string>
): string {
	const maxFields = fieldNames.length
	const escape = (s: string) => {
		if (s.includes(',') || s.includes('"') || s.includes('\n')) {
			return `"${s.replace(/"/g, '""')}"`
		}
		return s
	}

	const lines = [fieldNames.map(escape).join(',')]
	for (const note of notes) {
		const row = [...note.fields]
		while (row.length < maxFields) row.push('')
		lines.push(row.map(escape).join(','))
	}
	return lines.join('\n')
}

export function downloadCsv(csv: string, filename: string) {
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}
