import { Label } from '@/components/ui/label'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { useController } from 'react-hook-form'
import { ErrorLabel, ControlledFieldProps } from '.'
import languages from '@/lib/languages'

export default function LanguagesSpokenField({
	control,
	error,
	primary,
}: ControlledFieldProps & { primary?: string }) {
	const {
		field: { value, onChange },
	} = useController({ name: 'languages_spoken', control })
	return (
		<div className="flex flex-col gap-1">
			<Label
				htmlFor="languages_spoken"
				className={error ? 'text-destructive' : ''}
			>
				Do you know other languages?
			</Label>
			<FancyMultiSelect always={primary ? languages[primary] : undefined} />
			<ErrorLabel {...error} />
		</div>
	)
}
