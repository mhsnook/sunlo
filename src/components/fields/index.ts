import {
	UseFormRegister,
	FieldError,
	FieldValues,
	Control,
} from 'react-hook-form'
import ErrorLabel from '@/components/fields/error-label'

import AvatarEditorField from '@/components/fields/avatar-editor-field'
import EmailField from '@/components/fields/email-field'
import LanguagePrimaryField from '@/components/fields/language-primary-field'
import LanguagesSpokenField from '@/components/fields/languages-spoken-field'
import PasswordField from '@/components/fields/password-field'
import UsernameField from '@/components/fields/username-field'
import UserRoleField from '@/components/fields/user-role-field'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import TranslationTextField from '@/components/fields/translation-text-field'

type AnyFieldType = {
	error?: FieldError
	tabIndex?: number
}

export type FieldProps<T extends FieldValues> = AnyFieldType & {
	register: UseFormRegister<T>
}

// A field is a packaged-up set of an input, a label, and an error
export type ControlledFieldProps<T extends FieldValues> = AnyFieldType & {
	control: Control<T>
}

export type ControlledInputProps = {
	hasError?: boolean
	value: string
	setValue: (value: string) => void
	disabled?: string[]
	tabIndex?: number
}

export {
	AvatarEditorField,
	EmailField,
	ErrorLabel,
	LanguagePrimaryField,
	LanguagesSpokenField,
	PasswordField,
	UsernameField,
	UserRoleField,
	TranslationLanguageField,
	TranslationTextField,
}
