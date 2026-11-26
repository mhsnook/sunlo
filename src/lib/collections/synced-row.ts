export type SyncedCollection<T extends object, TKey extends string> = {
	isReady: () => boolean
	get: (key: TKey) => T | undefined
	getKeyFromItem: (item: T) => TKey
	_state: { syncedData: { get: (key: TKey) => T | undefined } }
	utils: {
		writeUpsert: (data: T) => void
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
	const changed = rows.filter((row) => {
		const key = collection.getKeyFromItem(row)
		// Against the synced layer, not `get()`: the optimistic row carries the
		// client's clock, which can run ahead of the server's.
		if (isOlder(row, syncedRow(collection, key))) return false
		// A row we already hold re-runs every live query over the collection
		// for nothing.
		const current = collection.get(key)
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

/**
 * The row the server last confirmed, without the optimistic layer that
 * `collection.get()` puts on top.
 */
export function syncedRow<T extends object, TKey extends string>(
	collection: SyncedCollection<T, TKey>,
	key: TKey
): T | undefined {
	// TanStack DB has no public read of the synced layer; query-db-collection's
	// own write utils read it this way.
	// oxlint-disable-next-line no-underscore-dangle
	return collection._state.syncedData.get(key)
}

/** One row's worth of {@link writeSyncedRows}. */
export function writeSyncedRow<T extends object, TKey extends string>(
	collection: SyncedCollection<T, TKey>,
	row: T
): void {
	writeSyncedRows(collection, [row])
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

/**
 * Is `row` an earlier version than the one we hold? A realtime frame can
 * arrive after the ack of a later write. Only rows that both carry
 * `updated_at` can say; any other row writes.
 */
function isOlder(row: object, held: object | undefined): boolean {
	const incoming = read(row, 'updated_at')
	const current = held && read(held, 'updated_at')
	if (typeof incoming !== 'string' || typeof current !== 'string') return false
	return compareTimestamps(incoming, current) < 0
}

/** An unparseable timestamp compares equal, so its row still writes. */
function compareTimestamps(a: string, b: string): number {
	const millis = Date.parse(a) - Date.parse(b)
	if (Number.isNaN(millis)) return 0
	return millis || microseconds(a) - microseconds(b)
}

/** Postgres keeps the microseconds that `Date.parse` drops. */
const microseconds = (timestamp: string) =>
	Number(/\.\d{3}(\d{0,3})/.exec(timestamp)?.[1]?.padEnd(3, '0') ?? 0)

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
