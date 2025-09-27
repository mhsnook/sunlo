import type { FieldProps } from './types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldValues, Path } from 'react-hook-form'
import ErrorLabel from './error-label'

export default function UsernameField<T extends FieldValues>({
	register,
	error,
}: FieldProps<T>) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="username" className={error ? 'text-destructive' : ''}>
				Your nickname
			</Label>
			<p className="text-muted-foreground text-sm italic">
				Your username helps you find friends, and accompanies your contributions
				to the library.
			</p>
			<Input
				type="text"
				placeholder="e.g. Learnie McLearnerson, Helpar1992"
				{...register('username' as Path<T>)}
				inputMode="text"
				// oxlint-disable-next-line tabindex-no-positive
				tabIndex={1}
				aria-invalid={!!error}
				className={error ? 'bg-destructive/20' : ''}
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
