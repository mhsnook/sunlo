import { SelectOneLanguage } from '@/components/select-one-language'
import { Label } from '@/components/ui/label'
import { FieldValues, Path, useController } from 'react-hook-form'
import type { ControlledFieldProps } from './types'
import ErrorLabel from './error-label'

export default function LanguagePrimaryField<T extends FieldValues>({
	control,
	error,
}: ControlledFieldProps<T>) {
	const controller = useController({
		name: 'language_primary' as Path<T>,
		control,
	})
	// console.log(`Controller is: `, controller)

	return (
		<div className="flex flex-col gap-1">
			<Label
				htmlFor="language_primary"
				className={error ? 'text-destructive' : ''}
			>
				Primary language
			</Label>
			<SelectOneLanguage
				value={controller.field.value}
				setValue={controller.field.onChange}
				hasError={!!error}
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
