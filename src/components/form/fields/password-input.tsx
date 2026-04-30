import { TextInput } from './text-input'

export function PasswordInput({
	label = 'Password',
	placeholder = '* * * * * * * *',
	autoComplete = 'current-password',
	...rest
}: Omit<Parameters<typeof TextInput>[0], 'type'>) {
	return (
		<TextInput
			type="password"
			label={label}
			placeholder={placeholder}
			autoComplete={autoComplete}
			{...rest}
		/>
	)
}
