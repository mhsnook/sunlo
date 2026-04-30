import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore, useChatRouteLang } from '../store'
import { useChatSearch, useChatTurns } from '../hooks'
import { suggestForQuery } from '../suggestions'

export function SuggestionStrip() {
	const lang = useChatRouteLang()
	const turns = useChatTurns()
	const dismissed = useChatStore((s) => s.dismissedSuggestionsByLang[lang])
	const dismissSuggestion = useChatStore((s) => s.dismissSuggestion)
	const search = useChatSearch()

	// Find the most recent text-mode turn — anchor pivots aren't user-typed
	// queries so they don't carry suggestions.
	const latest = [...turns].toReversed().find((t) => t.query.kind === 'text')
	if (!latest || latest.query.kind !== 'text') return null

	const all = suggestForQuery(lang, latest.query.text)
	const pending = all.filter((s) => !dismissed?.has(`${latest.id}|${s.key}`))

	if (pending.length === 0) return null

	const current = pending[0]
	const total = pending.length

	const accept = () => {
		dismissSuggestion(lang, latest.id, current.key)
		search.mutate({ query: { kind: 'text', text: current.applied } })
	}
	const dismiss = () => {
		dismissSuggestion(lang, latest.id, current.key)
	}

	return (
		<div
			data-testid="chat-suggestion-strip"
			className="text-muted-foreground flex flex-row items-center justify-between gap-2 px-1 py-0.5 text-xs"
		>
			<span>
				<span className="text-muted-foreground/70 font-mono">
					1 of {total}:{' '}
				</span>
				<span lang={lang}>{current.fromMatch}</span>
				<span className="text-muted-foreground/70"> → </span>
				<span lang={lang} className="text-foreground font-medium">
					{current.to}
				</span>
				?
			</span>
			<div className="flex flex-row items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					data-testid="chat-suggestion-accept"
					aria-label={`Accept suggestion ${current.fromMatch} → ${current.to}`}
					onClick={accept}
				>
					<Check className="h-3 w-3" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					data-testid="chat-suggestion-dismiss"
					aria-label="Dismiss suggestion"
					onClick={dismiss}
				>
					<X className="h-3 w-3" />
				</Button>
			</div>
		</div>
	)
}
