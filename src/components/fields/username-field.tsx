import { type FieldProps, ErrorLabel } from '.'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldValues, Path } from 'react-hook-form'

export default function UsernameField<T extends FieldValues>({
	register,
	error,
}: FieldProps<T>) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="username" className={error ? 'text-destructive' : ''}>
				Your nickname
			</Label>
			<Input
				type="text"
				placeholder="e.g. Learnie McLearnerson, Helpar1992"
				{...register('username' as Path<T>)}
				inputMode="text"
				tabIndex={1}
				aria-invalid={!!error}
				className={error ? 'bg-destructive/20' : ''}
			/>
			<ErrorLabel {...error} />
		</div>
	)
}
