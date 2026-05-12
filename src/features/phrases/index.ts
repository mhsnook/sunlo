// Feature: phrases — Phrases, translations, search, provenance
// Public API for the phrases domain

// Schemas & types
export {
	PhraseFullSchema,
	type PhraseFullType,
	type PhraseFullFullType,
	type PhraseFullFilteredType,
	TranslationSchema,
	type TranslationType,
	PhraseSearchSchema,
	FilterEnumSchema,
	SmartSearchSortBySchema,
} from './schemas'

// Collections
export { phrasesCollection } from './collections'

// Live collections
export {
	phrasesFull,
	usePhrasePlaylists,
	usePhraseComments,
	useRelatedCards,
	type PhraseProvenanceItem,
	type PhraseProvenancePlaylist,
	type PhraseProvenanceComment,
	type RelatedCard,
	type RelatedCardSource,
} from './live'

// Hooks
export {
	useLanguagePhrases,
	useLangPhrasesRaw,
	useOnePhrase,
	useLanguagePhrasesSearch,
	useLanguagePhrase,
	useAllMyPhrasesLang,
	useAnyonesPhrases,
	usePhraseProvenance,
} from './hooks'

export {
	usePhrase,
	splitPhraseTranslations,
	type CompositePhraseQueryResults,
} from '@/hooks/composite-phrase'

export { useCompositePids } from '@/hooks/composite-pids'
