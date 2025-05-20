import type { FieldProps } from '.'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ErrorLabel from '@/components/fields/error-label'

export default function TranslationTextField({ register, error }: FieldProps) {
	return (
		<div>
			<Label>Phrase meaning</Label>
			<Textarea
				{...register('translation_text')}
				placeholder="Translation text"
			/>
			<ErrorLabel {...error} />
		</div>
	)
}
