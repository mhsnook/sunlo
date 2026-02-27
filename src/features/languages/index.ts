// Feature: languages — Language metadata, tags, static data
// Public API for the languages domain

// Schemas & types
export {
	LanguageSchema,
	type LanguageType,
	LangTagSchema,
	type LangTagType,
	PhraseTagSchema,
	type PhraseTagType,
} from '@/lib/schemas/languages'

export { LangSchema, type LangType } from '@/lib/schemas/shared'

// Collections
export {
	languagesCollection,
	langTagsCollection,
} from '@/lib/collections/languages'

// Hooks
export { useLanguageMeta, useLanguageTags } from '@/hooks/use-language'

// Static data
export { default as languages } from '@/lib/languages'
