import React from 'react'
import { FieldValues, Path, useController } from 'react-hook-form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ShowError } from '@/components/errors'
import { cn } from '@/lib/utils'
import { ControlledFieldProps } from '.'

export type FancySelectOption = {
	value: string | number
	label: string
	description: string
	Icon?: React.ElementType
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
	const handleChange = (newValue: string) => {
		onChange(isNumeric ? parseInt(newValue, 10) : newValue)
	}

	return (
		<div>
			<RadioGroup
				onValueChange={handleChange}
				value={String(value)}
				className="gap-0"
			>
				{options.map((option) => (
					<React.Fragment key={option.value}>
						<RadioGroupItem
							value={String(option.value)}
							id={`${name}-${option.value}`}
							className="sr-only"
						/>
						<Label
							htmlFor={`${name}-${option.value}`}
							className={cn(
								`flex w-full cursor-pointer items-center rounded border border-transparent p-4 transition-colors`,
								String(value) === String(option.value) ?
									'bg-primary/20 border-primary-foresoft/30'
								:	'hover:bg-primary/10 hover:border-input'
							)}
						>
							{option.Icon && (
								<option.Icon
									className={`transition-color mr-3 size-5 ${
										String(value) === String(option.value) ? 'text-primary' : ''
									}`}
								/>
							)}
							<div className="space-y-1">
								<div>{option.label}</div>
								<div className="text-sm font-medium opacity-60">
									{option.description}
								</div>
							</div>
						</Label>
					</React.Fragment>
				))}
			</RadioGroup>
			<ShowError>{error?.message}</ShowError>
		</div>
	)
}
