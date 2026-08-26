type RowCollection<T extends object> = {
	get: (key: string) => T | undefined
	utils: { writeUpsert: (data: T) => void }
}

/**
 * Put one server-supplied row into a collection's synced state — a realtime
 * INSERT or UPDATE frame, or the row a persistence handler wrote back.
 *
 * Upserts rather than inserts or updates, because the two callers race: a
 * frame can arrive for a row this client never fetched (`writeUpdate` throws
 * on a key it cannot find), and a frame for this client's own write can land
 * before its handler resolves (`writeInsert` throws on a key already there).
 *
 * Skips the write when every field already matches — the same row arriving
 * twice — because writing it would re-run every live query for nothing.
 */
export function writeSyncedRow<T extends object>(
	collection: RowCollection<T>,
	key: string,
	row: T
): void {
	const current = collection.get(key)
	if (
		current &&
		Object.keys(row).every(
			(field) => current[field as keyof T] === row[field as keyof T]
		)
	)
		return
	collection.utils.writeUpsert(row)
}

type DeletableCollection = {
	get: (key: string) => unknown
	utils: { writeDelete: (key: string) => void }
}

/**
 * Drop a row from a collection's synced state.
 *
 * Skips the write when the collection does not hold the row: `writeDelete`
 * throws on a key it cannot find, and both callers can race one another. A
 * realtime frame can arrive for a row this client never fetched, and a
 * persistence handler can reach here after the frame for its own write already
 * landed. Soft-deleting tables arrive as an UPDATE carrying `deleted` — see
 * docs/mutations.md.
 */
export function deleteSyncedRow(
	collection: DeletableCollection,
	key: string
): void {
	if (collection.get(key)) collection.utils.writeDelete(key)
}
