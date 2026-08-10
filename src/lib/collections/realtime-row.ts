type RowCollection<T extends object> = {
	get: (key: string) => T | undefined
	utils: { writeUpsert: (data: T) => void }
}

/**
 * Apply a realtime INSERT or UPDATE frame to a collection's synced state.
 *
 * Upserts rather than updates: if a frame arrives for a row this client hasn't
 * fetched, `writeUpdate` will throw on a key it cannot find.
 *
 * Skips the write when every field already matches — that is this client's own
 * mutation echoing back, and writing it would re-run every live query for
 * nothing.
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
