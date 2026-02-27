// Feature: profile — User profiles, identity, language preferences
// Public API for the profile domain

// Schemas & types
export {
	PublicProfileSchema,
	type PublicProfileType,
	MyProfileSchema,
	type MyProfileType,
	LanguageKnownSchema,
	type LanguageKnownType,
	LanguagesKnownSchema,
	type LanguagesKnownType,
	LanguageProficiencyEnumSchema,
	type LanguageProficiencyEnumType,
	LearningGoalEnumSchema,
	FontPreferenceSchema,
	type FontPreferenceType,
} from './schemas'

// Collections
export {
	publicProfilesCollection,
	myProfileCollection,
	myProfileQuery,
} from './collections'

// Hooks
export { useAuth, useUserId } from '@/lib/use-auth'
export { useProfile, useLanguagesToShow } from './hooks'
