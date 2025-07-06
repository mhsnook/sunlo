import { Label } from '@/components/ui/label'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { FieldValues, Path, useController } from 'react-hook-form'
import { ErrorLabel, ControlledFieldProps } from '.'
import languages, { allLanguageOptions } from '@/lib/languages'

export default function LanguagesSpokenField<T extends FieldValues>({
	control,
	error,
	primary,
}: ControlledFieldProps<T> & { primary?: string }) {
	const {
		field: { value, onChange },
	} = useController({ name: 'languages_spoken' as Path<T>, control })
	return (
		<div className="flex flex-col gap-1">
			<Label
				htmlFor="languages_spoken"
				className={error ? 'text-destructive' : ''}
			>
				Do you know other languages?
			</Label>
			<FancyMultiSelect
				options={allLanguageOptions}
				always={primary ? languages[primary] : undefined}
			/>
			<ErrorLabel {...error} />
		</div>
	)
}
