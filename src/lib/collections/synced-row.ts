export type SyncedCollection<T extends object, TKey extends string> = {
	isReady: () => boolean
	get: (key: TKey) => T | undefined
	getKeyFromItem: (item: T) => TKey
	utils: {
		writeUpsert: (data: T) => void
		writeDelete: (key: TKey) => void
		writeBatch: (writes: () => void) => void
	}
}

/**
 * Write rows the server confirmed — a mutation's ack, or a realtime frame —
 * into a collection's synced layer. See docs/mutations.md.
 */
export function writeSyncedRows<T extends object, TKey extends string>(
	collection: SyncedCollection<T, TKey>,
	rows: Array<T>
): void {
	// Dropped rather than thrown: a realtime callback has nowhere to put a
	// throw, and the collection's first fetch reads the committed row anyway.
	if (!collection.isReady()) return
	// A row we already hold re-runs every live query over the collection for
	// nothing.
	const changed = rows.filter((row) => {
		const current = collection.get(collection.getKeyFromItem(row))
		return !current || !sameRow(row, current)
	})
	if (changed.length === 0) return
	if (changed.length === 1) {
		collection.utils.writeUpsert(changed[0]!)
		return
	}
	// One commit, not one per row: a commit copies the whole collection into
	// the query cache and re-runs every live query over it.
	collection.utils.writeBatch(() => {
		for (const row of changed) collection.utils.writeUpsert(row)
	})
}

/** One row's worth of {@link writeSyncedRows}. */
export function writeSyncedRow<T extends object, TKey extends string>(
	collection: SyncedCollection<T, TKey>,
	row: T
): void {
	writeSyncedRows(collection, [row])
}

/**
 * Drop rows from a collection's synced layer. Skips a key the collection does
 * not hold: `writeDelete` throws on one, and a frame can arrive for a row this
 * client never fetched.
 */
export function deleteSyncedRows<T extends object, TKey extends string>(
	collection: SyncedCollection<T, TKey>,
	keys: Array<TKey>
): void {
	if (!collection.isReady()) return
	const held = keys.filter((key) => collection.get(key))
	if (held.length === 0) return
	if (held.length === 1) {
		collection.utils.writeDelete(held[0]!)
		return
	}
	collection.utils.writeBatch(() => {
		for (const key of held) collection.utils.writeDelete(key)
	})
}

/** One row's worth of {@link deleteSyncedRows}. */
export function deleteSyncedRow<T extends object, TKey extends string>(
	collection: SyncedCollection<T, TKey>,
	key: TKey
): void {
	deleteSyncedRows(collection, [key])
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
