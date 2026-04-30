import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useFieldContext } from '../form-hook'
import { ErrorList } from './error-list'
import { toTestId } from './utils'

type TextInputProps = Omit<
	ComponentProps<typeof Input>,
	'value' | 'onChange' | 'onBlur' | 'name' | 'id'
> & {
	label?: string
	description?: string
}

export function TextInput({
	label,
	description,
	className,
	...inputProps
}: TextInputProps) {
	const field = useFieldContext<string>()
	const meta = field.state.meta
	const showError = meta.isBlurred && meta.errors.length > 0

	return (
		<div className="flex flex-col gap-1">
			{label && (
				<Label
					htmlFor={field.name}
					className={showError ? 'text-destructive' : ''}
				>
					{label}
				</Label>
			)}
			<Input
				id={field.name}
				name={field.name}
				value={field.state.value ?? ''}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={field.handleBlur}
				aria-invalid={showError}
				data-testid={toTestId(field.name)}
				className={cn(showError && 'bg-destructive/20', className)}
				{...inputProps}
			/>
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			{showError && <ErrorList errors={meta.errors} />}
		</div>
	)
}
