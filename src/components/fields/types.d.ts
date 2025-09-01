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
type AnyArrayFieldType = {
	error?: FieldError[]
}

export type FieldProps<T extends FieldValues> = AnyFieldType & {
	register: UseFormRegister<T>
}
export type ArrayFieldProps<T extends ArrayFieldValues> = AnyArrayFieldType & {
	register: UseFormRegister<T>
}

// A field is a packaged-up set of an input, a label, and an error
export type ControlledFieldProps<T extends FieldValues> = AnyFieldType & {
	control: Control<T>
}
export type ControlledArrayFieldProps<T extends ArrayFieldValues> =
	AnyArrayFieldType & {
		control: Control<T>
	}

export type ControlledInputProps = {
	hasError?: boolean
	value: string
	setValue: (value: string) => void
	disabled?: string[]
	tabIndex?: number
}
