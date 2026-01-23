import type { FieldValues, Path } from 'react-hook-form'
import type { FieldProps } from './types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ErrorLabel from './error-label'

export default function PasswordField<T extends FieldValues>({
	register,
	error,
	tabIndex = 2,
}: FieldProps<T>) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="password" className={error ? 'text-destructive' : ''}>
				Password
			</Label>
			<Input
				{...register('password' as Path<T>)}
				inputMode="text"
				tabIndex={tabIndex}
				aria-invalid={!!error}
				className={error ? 'bg-destructive/20' : ''}
				type="password"
				placeholder="* * * * * * * *"
				data-testid="password-input"
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
