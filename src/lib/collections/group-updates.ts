/**
 * Groups a transaction's update mutations by their change payload, so that a
 * bulk update (mark-all-notifications-read, chat read receipts) sends one
 * request per distinct payload instead of one request per row.
 *
 * Grouping is by `JSON.stringify(changes)`. Two payloads that differ only in
 * key order land in separate groups, which costs an extra request but never
 * writes the wrong value.
 */
export function groupUpdatesByChanges<TChanges>(
	mutations: ReadonlyArray<{ changes: TChanges; key: string }>
): Array<{ changes: TChanges; keys: Array<string> }> {
	const groups = new Map<string, { changes: TChanges; keys: Array<string> }>()
	for (const mutation of mutations) {
		const signature = JSON.stringify(mutation.changes)
		const group = groups.get(signature)
		if (group) group.keys.push(mutation.key)
		else
			groups.set(signature, {
				changes: mutation.changes,
				keys: [mutation.key],
			})
	}
	return [...groups.values()]
}
