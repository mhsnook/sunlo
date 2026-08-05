/**
 * Groups a transaction's update mutations by change payload, so a bulk update
 * sends one request per distinct payload instead of one per row.
 *
 * Grouped by `JSON.stringify(changes)`: payloads differing only in key order
 * land in separate groups, costing an extra request but never a wrong write.
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
