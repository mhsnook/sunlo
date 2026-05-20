import {
	BrowserCollectionCoordinator,
	createBrowserWASQLitePersistence,
	openBrowserWASQLiteOPFSDatabase,
	persistedCollectionOptions,
	type BrowserWASQLiteDatabase,
	type PersistedCollectionPersistence,
} from '@tanstack/browser-db-sqlite-persistence'

// Bump when the persisted shape of any backed-up collection changes. A version
// mismatch drops the local SQLite cache and re-syncs from Supabase.
const SCHEMA_VERSION = 1

const DB_NAME = 'sunlo-user-collections'

// Open the OPFS database lazily on first collection sync rather than at module
// load: the SQLite worker is ~1.7 MB and we don't want it blocking first paint.
// Every backed-up collection shares this one database; the driver serialises
// access internally.
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

// OPFS + Web Workers are required for the local backup. They're absent in SSR,
// older browsers, and some private-browsing modes — when missing we return null
// and collections fall back to network-only sync. Module load must never throw.
function initPersistence(): PersistedCollectionPersistence | null {
	if (
		typeof navigator === 'undefined' ||
		typeof navigator.storage?.getDirectory !== 'function' ||
		typeof Worker !== 'function'
	) {
		return null
	}
	try {
		return createBrowserWASQLitePersistence({
			database: createLazyDatabase(),
			coordinator: new BrowserCollectionCoordinator({ dbName: DB_NAME }),
		})
	} catch (error) {
		console.warn(
			'[collections] Local SQLite backup unavailable; using network-only sync.',
			error
		)
		return null
	}
}

const persistence = initPersistence()

/**
 * Wraps a query-collection's options with a durable local SQLite backup.
 *
 * The collection hydrates instantly from OPFS on reload and keeps serving data
 * while offline; Supabase stays authoritative and reconciles on the next sync.
 * `persistedCollectionOptions` only wraps the `sync` layer and adds `persistence`
 * — getKey/schema/utils/onUpdate all pass through untouched, so the result is
 * structurally the same collection config. A no-op when OPFS is unavailable, so
 * callers need no fallback of their own.
 */
export function withLocalBackup<TOptions extends object>(
	options: TOptions
): TOptions {
	if (!persistence) return options
	const wrapped = persistedCollectionOptions({
		...options,
		persistence,
		schemaVersion: SCHEMA_VERSION,
	} as unknown as Parameters<typeof persistedCollectionOptions>[0])
	return wrapped as unknown as TOptions
}
