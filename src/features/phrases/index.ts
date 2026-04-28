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
} from './schemas'

// Collections
export { phrasesCollection } from './collections'

// Live collections
export { phrasesFull } from './live'

// Hooks
export {
	useLanguagePhrases,
	useLangPhrasesRaw,
	useOnePhrase,
	useLanguagePhrasesSearch,
	useLanguagePhrase,
	useAllMyPhrasesLang,
	useAnyonesPhrases,
	usePhrasePlaylists,
	usePhraseComments,
	usePhraseProvenance,
	type PhraseProvenanceItem,
	type PhraseProvenancePlaylist,
	type PhraseProvenanceComment,
} from './hooks'

export {
	usePhrase,
	splitPhraseTranslations,
	type CompositePhraseQueryResults,
} from '@/hooks/composite-phrase'

export { useCompositePids } from '@/hooks/composite-pids'
export { useSmartSearch } from '@/hooks/use-smart-search'
