import type { ControlledFieldProps } from './types'
import { Label } from '@/components/ui/label'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { FieldValues, Path, useController } from 'react-hook-form'
import languages, { allLanguageOptions } from '@/lib/languages'
import ErrorLabel from './error-label'

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
			<div>
				<Label
					htmlFor="languages_spoken"
					className={error ? 'text-destructive' : ''}
				>
					Do you know other languages?
				</Label>
				<p className="text-muted-foreground text-sm">
					We'll show you translations available in any of the languages you're
					comfortable with.
				</p>
			</div>
			<FancyMultiSelect
				options={allLanguageOptions}
				selected={value}
				setSelected={onChange}
				always={primary ? languages[primary] : undefined}
				placeholder="Select languages..."
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
