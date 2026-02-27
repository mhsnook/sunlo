// Feature: auth — Authentication, profiles, user identity
// Public API for the auth domain

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
} from '@/lib/schemas/auth'

// Collections
export {
	publicProfilesCollection,
	myProfileCollection,
	myProfileQuery,
} from '@/lib/collections/auth'

// Hooks
export { useAuth, useUserId } from '@/lib/use-auth'
export { useProfile, useLanguagesToShow } from '@/hooks/use-profile'
