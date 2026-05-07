// Shared constants and types for the search stack. Each primitive
// (useLocalSearch, useSemanticSearch, useTrigramSearch) and the
// composing useMergedSearch / useHybridSearch import from here so
// product-decision values aren't duplicated.

export const MIN_QUERY_LENGTH = 2

// Synthetic trigram score given to local-only matches (entries
// useLocalSearch surfaced but the server didn't). Just high enough
// that they appear in the merged ranking ahead of nothing, low
// enough that any real server match outranks them.
export const LOCAL_ONLY_TRIGRAM_SCORE = 0.3

// The three kinds of entity that show up in search results. Used for
// type-filter chips, type-badge rendering, and the discriminator in
// the various ScoredItem / MergedSearchItem unions.
export type SearchEntityType = 'phrase' | 'playlist' | 'request'
