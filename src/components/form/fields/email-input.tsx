import { TextInput } from './text-input'

export function EmailInput({
	label = 'Email',
	placeholder = 'email@domain',
	...rest
}: Omit<Parameters<typeof TextInput>[0], 'type'>) {
	return (
		<TextInput
			type="email"
			inputMode="email"
			autoComplete="email"
			label={label}
			placeholder={placeholder}
			{...rest}
		/>
	)
}
