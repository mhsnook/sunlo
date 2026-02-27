// Feature: phrases — Phrases, translations, search, provenance
// Public API for the phrases domain

// Schemas & types
export {
	PhraseFullSchema,
	type PhraseFullType,
	type PhraseFullFullType,
	type PhraseFullFilteredType,
	type PhraseWithTranslationSplit,
	TranslationSchema,
	type TranslationType,
	PhraseSearchSchema,
	type PhraseSearchType,
	FilterEnumSchema,
	type FilterEnumType,
	SmartSearchSortBySchema,
	type SmartSearchSortByType,
} from '@/lib/schemas/phrases'

// Collections
export { phrasesCollection } from '@/lib/collections/phrases'

// Live collections
export { phrasesFull } from '@/lib/collections/live-phrases'

// Hooks
export {
	useLanguagePhrases,
	useLanguagePhrasesSearch,
	useLanguagePhrase,
	useAllMyPhrasesLang,
	usePhrasePlaylists,
	usePhraseComments,
	usePhraseProvenance,
	type PhraseProvenanceItem,
	type PhraseProvenancePlaylist,
	type PhraseProvenanceComment,
} from '@/hooks/use-language'

export {
	usePhrase,
	splitPhraseTranslations,
	type CompositePhraseQueryResults,
} from '@/hooks/composite-phrase'

export { useCompositePids } from '@/hooks/composite-pids'
export { useSmartSearch } from '@/hooks/use-smart-search'
