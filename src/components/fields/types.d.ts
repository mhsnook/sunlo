import {
	UseFormRegister,
	FieldError,
	FieldValues,
	Control,
} from 'react-hook-form'

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
