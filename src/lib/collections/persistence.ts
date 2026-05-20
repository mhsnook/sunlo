import {
	BrowserCollectionCoordinator,
	createBrowserWASQLitePersistence,
	openBrowserWASQLiteOPFSDatabase,
	persistedCollectionOptions,
	type BrowserWASQLiteDatabase,
} from '@tanstack/browser-db-sqlite-persistence'

const DB_NAME = 'sunlo-user-collections'

// Bump when the persisted shape of any user collection changes. For these
// synced collections a version mismatch drops the local SQLite copy and
// re-syncs from Supabase, so over-invalidating is cheap.
const SCHEMA_VERSION = 1

// Open the OPFS database lazily on first collection sync rather than at module
// load. The wa-sqlite worker is ~1.7 MB; deferring it keeps it off the critical
// path for first paint and the public/login pages, lets a worker-load failure
// degrade to network-only sync instead of white-screening the app, and means
// logged-out visitors never download it. All persisted collections share this
// one database; the driver serialises access internally.
function createLazyDatabase(): BrowserWASQLiteDatabase {
	let opening: Promise<BrowserWASQLiteDatabase> | null = null
	const open = () =>
		(opening ??= openBrowserWASQLiteOPFSDatabase({
			databaseName: `${DB_NAME}.sqlite`,
		}))
	return {
		execute: <TRow>(sql: string, params?: ReadonlyArray<unknown>) =>
			open().then((db) => db.execute<TRow>(sql, params)),
		close: async () => {
			if (opening) await (await opening).close?.()
		},
	}
}

const persistence = createBrowserWASQLitePersistence({
	database: createLazyDatabase(),
	coordinator: new BrowserCollectionCoordinator({ dbName: DB_NAME }),
})

// persistedCollectionOptions can't infer the collection's item type back
// through a generic wrapper, and passing explicit <T, TKey> generics would
// drop the queryCollectionOptions utils (refetch / writeInsert / …) that
// callers rely on. Treat it as a type-transparent transform instead: the
// runtime swap is sound because the sync-present path only replaces `sync`
// and adds `persistence` — getKey, schema, utils and the mutation handlers
// all pass through untouched.
const persist = persistedCollectionOptions as <T extends object>(
	options: T
) => T

/**
 * Wraps a query collection's options with a durable local SQLite base.
 *
 * The collection hydrates from OPFS instantly on reload and keeps serving data
 * while offline; Supabase stays the source of truth and reconciles on the next
 * sync. Used by the user collections — profile, decks, cards, reviews.
 */
export function withPersistence<TOptions extends object>(
	options: TOptions
): TOptions {
	return persist({ ...options, persistence, schemaVersion: SCHEMA_VERSION })
}
