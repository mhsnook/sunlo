import { useCallback, Fragment, type ElementType } from 'react'
import { FieldValues, Path, useController } from 'react-hook-form'
import type { ControlledFieldProps } from './types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import ErrorLabel from './error-label'

export type FancySelectOption = {
	value: string | number
	label: string
	description: string
	Icon?: ElementType
}

type FancySelectFieldProps<T extends FieldValues> = ControlledFieldProps<T> & {
	name: Path<T>
	options: FancySelectOption[]
}

export function FancySelectField<T extends FieldValues>({
	control,
	error,
	name,
	options,
}: FancySelectFieldProps<T>) {
	const {
		field: { value, onChange },
	} = useController({ name, control })

	const isNumeric = typeof options[0]?.value === 'number'
	const handleChange = useCallback(
		(newValue: string) => {
			onChange(isNumeric ? parseInt(newValue, 10) : newValue)
		},
		[onChange, isNumeric]
	)

	return (
		<div>
			<RadioGroup
				onValueChange={handleChange}
				value={String(value)}
				className="gap-0"
			>
				{options.map((option) => (
					<Fragment key={option.value}>
						<RadioGroupItem
							value={String(option.value)}
							id={`${name}-${option.value}`}
							className="sr-only"
						/>
						<Label
							htmlFor={`${name}-${option.value}`}
							className={cn(
								`flex w-full cursor-pointer items-center rounded-2xl border border-transparent p-4 transition-colors`,
								String(value) === String(option.value) ?
									'bg-primary/20 border-primary-foresoft/30'
								:	'hover:bg-primary/10 hover:border-input'
							)}
						>
							{option.Icon && (
								<span
									className={`transition-color mr-3 flex aspect-square place-items-center rounded-xl p-2 ${
										String(value) === String(option.value) ?
											'bg-primary-foresoft text-white'
										:	''
									}`}
								>
									<option.Icon className="size-5" />
								</span>
							)}
							<div className="space-y-1">
								<div>{option.label}</div>
								<div className="text-sm font-medium opacity-60">
									{option.description}
								</div>
							</div>
						</Label>
					</Fragment>
				))}
			</RadioGroup>
			<ErrorLabel error={error} />
		</div>
	)
}
