import { Label } from '@/components/ui/label'
import { LanguagePicker } from './language-picker'
import { useFieldContext } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'

export default function TranslationLanguageField({
	phraseLang,
}: {
	phraseLang: string
}) {
	const field = useFieldContext<string>()
	const meta = field.state.meta
	const showError = meta.isBlurred && meta.errors.length > 0

	return (
		<div className="flex flex-col gap-1">
			<Label className={showError ? 'text-destructive' : ''}>
				Translation language
			</Label>
			<LanguagePicker
				value={field.state.value ?? ''}
				setValue={(v) => {
					field.handleChange(v)
					field.handleBlur()
				}}
				hasError={showError}
				disabled={[phraseLang]}
			>
				Select language…
			</LanguagePicker>
			{showError && <ErrorList errors={meta.errors} />}
		</div>
	)
}
