import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { EmailInput } from './fields/email-input'
import { PasswordInput } from './fields/password-input'
import { TextInput } from './fields/text-input'
import { TextareaInput } from './fields/textarea-input'
import { FormAlert } from './form-parts/form-alert'
import { SubmitButton } from './form-parts/submit-button'

export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts()

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		EmailInput,
		PasswordInput,
		TextInput,
		TextareaInput,
	},
	formComponents: {
		FormAlert,
		SubmitButton,
	},
})
