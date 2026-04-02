import { useState } from 'react'
import { Languages, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LangBadge } from '@/components/ui/badge'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { usePreferredTranslationLang } from '@/features/deck/hooks'

export interface TranslationDraft {
	lang: string
	text: string
	literal?: string
}

/**
 * Inline form for adding a single translation to a phrase comment or reply.
 */
export function AddTranslationInline({
	phraseLang,
	onAdd,
	onCancel,
}: {
	phraseLang: string
	onAdd: (draft: TranslationDraft) => void
	onCancel: () => void
}) {
	const preferredLang = usePreferredTranslationLang(phraseLang)
	const [lang, setLang] = useState(preferredLang)
	const [text, setText] = useState('')

	const handleAdd = () => {
		if (text.trim() && lang && lang !== phraseLang) {
			onAdd({ lang, text: text.trim() })
		}
	}

	return (
		<div className="bg-muted/50 space-y-3 rounded-lg border p-3">
			<p className="text-sm font-medium">Add a translation</p>
			<div className="flex flex-col gap-2">
				<SelectOneOfYourLanguages
					value={lang}
					setValue={setLang}
					disabled={[phraseLang]}
				/>
				<Textarea
					placeholder="Translation text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					rows={2}
				/>
			</div>
			<div className="flex gap-2">
				<Button
					type="button"
					size="sm"
					onClick={handleAdd}
					disabled={!text.trim() || !lang || lang === phraseLang}
				>
					Add
				</Button>
				<Button type="button" variant="neutral" size="sm" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	)
}

/**
 * Displays an attached translation with a remove button.
 */
export function AttachedTranslation({
	translation,
	onRemove,
}: {
	translation: TranslationDraft
	onRemove: () => void
}) {
	return (
		<div>
			<p className="mb-2 text-sm font-medium">Translation</p>
			<div className="bg-muted flex items-center gap-2 rounded-lg p-2">
				<LangBadge lang={translation.lang} />
				<span className="flex-1 text-sm">{translation.text}</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={onRemove}
				>
					<X className="h-3 w-3" />
				</Button>
			</div>
		</div>
	)
}

/**
 * Button to open the translation form.
 */
export function SuggestTranslationButton({ onClick }: { onClick: () => void }) {
	return (
		<Button type="button" variant="soft" size="sm" onClick={onClick}>
			<Languages className="me-1 h-4 w-4" />
			Suggest a translation
		</Button>
	)
}
