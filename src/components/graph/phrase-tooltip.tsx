import type { PhraseFullType } from '@/lib/schemas'

interface PhraseTooltipProps {
	phrase: PhraseFullType | undefined
	x: number
	y: number
	visible: boolean
}

export default function PhraseTooltip({
	phrase,
	x,
	y,
	visible,
}: PhraseTooltipProps) {
	if (!visible || !phrase) return null

	const translations = phrase.translations
		.filter((t) => !t.archived)
		.slice(0, 3)

	return (
		<div
			className="bg-popover text-popover-foreground pointer-events-none absolute z-50 max-w-64 rounded-2xl border px-3 py-2 shadow-lg"
			style={{
				left: x + 12,
				top: y - 8,
			}}
		>
			<p className="text-sm font-medium">{phrase.text}</p>
			{translations.length > 0 && (
				<div className="text-muted-foreground mt-1 space-y-0.5">
					{translations.map((t) => (
						<p key={t.id} className="text-xs">
							{t.text}
						</p>
					))}
				</div>
			)}
			{phrase.tags.length > 0 && (
				<div className="mt-1.5 flex flex-wrap gap-1">
					{phrase.tags.slice(0, 4).map((tag) => (
						<span
							key={tag.id}
							className="bg-primary-foresoft/20 text-primary-foresoft rounded px-1.5 py-0.5 text-[10px]"
						>
							{tag.name}
						</span>
					))}
				</div>
			)}
		</div>
	)
}
