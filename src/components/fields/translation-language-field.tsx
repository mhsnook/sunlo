import { Label } from '@/components/ui/label'
import { FieldValues, Path, useController } from 'react-hook-form'
import { ErrorLabel, type ControlledFieldProps } from '.'
import { SelectOneOfYourLanguages } from './select-one-of-your-languages'

export default function TranslationLanguageField<T extends FieldValues>({
	control,
	error,
}: ControlledFieldProps<T>) {
	const controller = useController({
		name: 'translation_lang' as Path<T>,
		control,
	})

	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="lang" className={error ? 'text-destructive' : ''}>
				Translation for
			</Label>
			<SelectOneOfYourLanguages
				value={controller.field.value}
				setValue={controller.field.onChange}
				hasError={!!error}
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
