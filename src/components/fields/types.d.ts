// Plain controlled-input contract for our select-language pickers.
// They take value/setValue and live outside the form module so they can
// be used from non-form contexts (search overlays, admin tools, etc).
export type ControlledInputProps = {
	hasError?: boolean
	value: string
	setValue: (value: string) => void
	disabled?: string[]
	tabIndex?: number
	className?: string
}
