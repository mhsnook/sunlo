import type { FieldProps } from '.'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ErrorLabel from '@/components/fields/error-label'
import { FieldValues, Path } from 'react-hook-form'

export default function TranslationTextField<T extends FieldValues>({
	register,
	error,
}: FieldProps<T>) {
	return (
		<div>
			<Label>Phrase meaning</Label>
			<Textarea
				{...register('translation_text' as Path<T>)}
				placeholder="Translation text"
			/>
			<ErrorLabel error={error} />
		</div>
	)
}
