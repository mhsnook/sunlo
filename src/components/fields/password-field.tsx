import { type FieldProps, ErrorLabel } from '.'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldValues, Path } from 'react-hook-form'

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
			/>
			<ErrorLabel {...error} />
		</div>
	)
}
