import { type FieldProps, ErrorLabel } from '.'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldValues, Path } from 'react-hook-form'

export default function EmailField<T extends FieldValues>({
	register,
	error,
	tabIndex = 1,
}: FieldProps<T>) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="email" className={error ? 'text-destructive' : ''}>
				Email
			</Label>
			<Input
				{...register('email' as Path<T>)}
				inputMode="email"
				aria-invalid={!!error}
				tabIndex={tabIndex}
				type="email"
				className={error ? 'bg-destructive/20' : ''}
				placeholder="email@domain"
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
