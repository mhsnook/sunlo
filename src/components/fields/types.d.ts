import {
	UseFormRegister,
	FieldError,
	FieldValues,
	Control,
	FieldErrors,
} from 'react-hook-form'

type AnyFieldType = {
	error?: FieldError
	tabIndex?: number
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArrayFieldType<T extends FieldValues> = {
	error?: FieldErrors<T>[keyof FieldErrors<T>]
}

export type FieldProps<T extends FieldValues> = AnyFieldType & {
	register: UseFormRegister<T>
}
export type ArrayFieldProps<T extends FieldValues> = AnyArrayFieldType<T> & {
	register: UseFormRegister<T>
}

// A field is a packaged-up set of an input, a label, and an error
export type ControlledFieldProps<T extends FieldValues> = AnyFieldType & {
	control: Control<T>
}
export type ControlledArrayFieldProps<T extends FieldValues> =
	AnyArrayFieldType<T> & {
		control: Control<T>
	}

export type ControlledInputProps = {
	hasError?: boolean
	value: string
	setValue: (value: string) => void
	disabled?: string[]
	tabIndex?: number
	className?: string
}
