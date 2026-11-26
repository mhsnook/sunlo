/**
 * Groups a transaction's update mutations by change payload, so a bulk update
 * sends one request per distinct payload instead of one per row.
 *
 * `scopeOf` splits groups further: two mutations share a group only when they
 * share both the payload and the scope, so a handler can filter one request on
 * a column the group has in common (a card's `phrase_id`, say).
 *
 * Grouped by `JSON.stringify(changes)`: payloads differing only in key order
 * land in separate groups, costing an extra request rather than a wrong write.
 */
export function groupUpdatesByChanges<
	TMutation extends { changes: unknown; key: string },
>(
	mutations: ReadonlyArray<TMutation>,
	scopeOf: (mutation: TMutation) => string = () => ''
): Array<{
	changes: TMutation['changes']
	keys: Array<string>
	mutations: Array<TMutation>
}> {
	const groups = new Map<
		string,
		{
			changes: TMutation['changes']
			keys: Array<string>
			mutations: Array<TMutation>
		}
	>()
	for (const mutation of mutations) {
		const signature = JSON.stringify([scopeOf(mutation), mutation.changes])
		const group = groups.get(signature)
		if (group) {
			group.keys.push(mutation.key)
			group.mutations.push(mutation)
		} else
			groups.set(signature, {
				changes: mutation.changes,
				keys: [mutation.key],
				mutations: [mutation],
			})
	}
	return [...groups.values()]
}
