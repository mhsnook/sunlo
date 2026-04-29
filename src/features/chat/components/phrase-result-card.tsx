import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useChatStore, useChatRouteLang } from '../store'
import type { ChatResultPhraseType } from '../schemas'

type Props = {
	phrase: ChatResultPhraseType
}

export function PhraseResultCard({ phrase }: Props) {
	const lang = useChatRouteLang()
	const inCart = useChatStore((s) =>
		(s.cartByLang[lang] ?? []).some((p) => p.id === phrase.id)
	)
	const toggleResult = useChatStore((s) => s.toggleResult)

	return (
		<div
			data-testid="chat-phrase-result"
			data-key={phrase.id}
			data-in-cart={inCart ? '' : undefined}
			className={cn(
				'flex flex-row items-start gap-3 rounded border p-3',
				inCart ? 'bg-1-mlo-primary' : 'bg-card/50'
			)}
		>
			<div className="flex flex-1 flex-col gap-1">
				<div className="text-base font-medium" lang={phrase.lang}>
					{phrase.text}
				</div>
				{phrase.translations.map((t) => (
					<div
						key={t.id}
						className="text-muted-foreground text-sm"
						lang={t.lang}
					>
						{t.text}
					</div>
				))}
			</div>
			<Button
				type="button"
				variant={inCart ? 'soft' : 'ghost'}
				size="icon"
				data-testid="chat-toggle-cart-button"
				aria-label={inCart ? 'Remove from cart' : 'Add to cart'}
				onClick={() => toggleResult(lang, phrase)}
			>
				{inCart ? <Check /> : <Plus />}
			</Button>
		</div>
	)
}
