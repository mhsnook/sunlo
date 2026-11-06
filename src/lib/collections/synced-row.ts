export type SyncedCollection<T extends object, TKey extends string | number> = {
	isReady: () => boolean
	get: (key: TKey) => T | undefined
	getKeyFromItem: (item: T) => TKey
	utils: {
		writeUpsert: (data: T | Array<T>) => Promise<void>
	}
}

/**
 * Write rows the server confirmed — a mutation's ack, or a realtime frame —
 * into a collection's synced layer. See docs/mutations.md.
 */
export async function writeSyncedRows<
	T extends object,
	TKey extends string | number,
>(collection: SyncedCollection<T, TKey>, rows: Array<T>): Promise<void> {
	// Dropped rather than rejected: a realtime callback has nowhere to put a
	// rejection, and the collection's first fetch reads the committed row anyway.
	if (!collection.isReady()) return
	// A row we already hold re-runs every live query over the collection for
	// nothing.
	const changed = rows.filter((row) => {
		const current = collection.get(collection.getKeyFromItem(row))
		return !current || !sameRow(row, current)
	})
	if (changed.length === 0) return
	// One array, not one call per row: each call is a commit, and a commit
	// copies the whole collection into the query cache and re-runs every live
	// query over it.
	await collection.utils.writeUpsert(changed)
}

/** One row's worth of {@link writeSyncedRows}. */
export function writeSyncedRow<T extends object, TKey extends string | number>(
	collection: SyncedCollection<T, TKey>,
	row: T
): Promise<void> {
	return writeSyncedRows(collection, [row])
}

/**
 * Does the server's row carry every field we submitted? `created_at` and
 * `updated_at` are the server's to set, and a missing row passes — a soft
 * delete may not be selectable back under RLS.
 */
export function rowMatches(
	submitted: object,
	row: object | undefined
): boolean {
	if (!row) return true
	return fields(submitted).every(
		([field, value]) =>
			field === 'created_at' ||
			field === 'updated_at' ||
			sameValue(value, read(row, field))
	)
}

/** Did the server return a matching row for every row we submitted? */
export function allRowsMatch(
	submitted: Array<object>,
	returned: Array<object>
): boolean {
	return (
		submitted.length === returned.length &&
		submitted.every((row) => returned.some((r) => rowMatches(row, r)))
	)
}

const fields = (value: object) => Object.entries(value)
const read = (value: object, field: string) =>
	(value as Record<string, unknown>)[field]

/** Every field of `row`, timestamps included, against the row we hold. */
const sameRow = (row: object, current: object) =>
	fields(row).every(([field, value]) => sameValue(value, read(current, field)))

/** Deep equality: a jsonb column matches whatever key order it arrives in. */
function sameValue(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (
		typeof a !== 'object' ||
		typeof b !== 'object' ||
		!a ||
		!b ||
		Array.isArray(a) !== Array.isArray(b)
	)
		return false
	const keys = Object.keys(a)
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => sameValue(read(a, key), read(b, key)))
	)
}
