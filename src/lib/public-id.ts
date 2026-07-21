// Public-facing short IDs. See migration 20260717120000_public_facing_ids.sql
// and the `gen_public_id()` Postgres function it mirrors.
//
// These are the pretty, route-addressable handles that live in URLs. They are
// ADDITIVE: every row still has a uuid `id` that stays the primary key, join
// key, and client-minted optimistic token. A public_id never appears in a
// foreign key, so nothing joins on it.
//
// Phrases and requests mint their public_id client-side (same philosophy as
// their uuid `id`, so the optimistic row and the persisted row agree without a
// refetch). Comments and playlists are created server-side via RPC and inherit
// the DB default, so those flows don't call newPublicId().

// Same 62-char alphabet as the SQL generator. Order is irrelevant as long as it
// matches nothing about the uuid format (see looksLikeUuid).
const ALPHABET =
	'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * A random base62 handle. Default length 10 ≈ 59 bits of entropy — plenty at
 * this app's scale; the DB's unique index is the collision backstop. This is
 * obfuscation, not security: RLS remains the access-control boundary.
 */
export function newPublicId(size = 10): string {
	const bytes = crypto.getRandomValues(new Uint8Array(size))
	let out = ''
	for (let i = 0; i < size; i++) out += ALPHABET[bytes[i]! % 62]
	return out
}
