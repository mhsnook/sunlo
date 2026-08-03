type RowCollection<T extends object> = {
	get: (key: string) => T | undefined
	utils: { writeUpsert: (data: T) => void }
}

/**
 * Apply a realtime INSERT or UPDATE frame to a collection's synced state.
 *
 * Writes an upsert rather than an update, because a frame can arrive for a row
 * this client never fetched — notifications load the newest 100 — and
 * `writeUpdate` throws on a key it cannot find.
 *
 * Skips the write when every field already matches. That is what this client's
 * own mutation looks like coming back, and skipping it stops one
 * mark-all-as-read from re-running every live query over the collection once
 * per row.
 */
export function writeRealtimeRow<T extends object>(
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
