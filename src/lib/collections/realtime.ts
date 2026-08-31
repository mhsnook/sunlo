import type { RealtimeChannel } from '@supabase/supabase-js'
import { writeSyncedRow, type SyncedCollection } from './synced-row'

/**
 * Fold a table's INSERT and UPDATE frames into its collection.
 *
 * `filter` scopes the stream before the RLS check runs — `uid=eq.<userId>`
 * on the user-tables channel, `request_id=eq.<id>` (and friends) on an
 * entity channel. RLS already scopes what a subscriber may receive; the
 * filter lets realtime discard a row earlier.
 *
 * No DELETE: Supabase RLS-scopes INSERT and UPDATE frames but broadcasts
 * every DELETE to every subscriber, carrying only the replica identity —
 * and a filter on any other column can never match it. Soft-deleted rows
 * arrive as UPDATE frames; a hard delete waits for the next full fetch.
 * See docs/mutations.md.
 */
export function bindRows<T extends object, TKey extends string>(
	channel: RealtimeChannel,
	table: string,
	filter: string,
	collection: SyncedCollection<T, TKey>,
	parse: (row: unknown) => T
): RealtimeChannel {
	const handle = (payload: { new: unknown }) => {
		// Ahead of the write's own check, so a route that never loaded this
		// collection doesn't parse frames it will throw away.
		if (!collection.isReady()) return
		writeSyncedRow(collection, parse(payload.new))
	}
	return (['INSERT', 'UPDATE'] as const).reduce(
		(ch, event) =>
			ch.on(
				'postgres_changes',
				{ event, schema: 'public', table, filter },
				handle
			),
		channel
	)
}
