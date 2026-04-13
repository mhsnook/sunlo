// Feature: languages — Language metadata, tags, static data
// Public API for the languages domain

// Schemas & types
export {
	LangSchema,
	type LangType,
	LanguageSchema,
	type LanguageType,
	LangTagSchema,
	type LangTagType,
	PhraseTagSchema,
	type PhraseTagType,
} from './schemas'

// Collections
export { languagesCollection, langTagsCollection } from './collections'

// Hooks
export {
	useLanguageMeta,
	useLanguageTags,
	useAllLanguages,
	useLanguagesSortedByLearners,
	useLanguagesWithPhrases,
	useAllLangTags,
} from './hooks'

// Static data
export { default as languages } from '@/lib/languages'
