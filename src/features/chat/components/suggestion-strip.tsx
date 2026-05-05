import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useChatRouteLang, useChatStore } from '../store'
import { suggestForQuery } from '../suggestions'

const DEBOUNCE_MS = 200
const MIN_LEN = 2

// Live suggestions for what the user is currently typing. Recomputed (after
// a short debounce) on every keystroke. Accepting updates the input text in
// place — no search runs and nothing is sent. Dismissing hides this one
// suggestion for the current input until they type something different.
export function SuggestionStrip() {
	const lang = useChatRouteLang()
	const rawInput = useChatStore((s) => s.inputByLang[lang] ?? '')
	const debouncedInput = useDebounce(rawInput, DEBOUNCE_MS)
	const dismissed = useChatStore((s) => s.dismissedSuggestionsByLang[lang])
	const dismissSuggestion = useChatStore((s) => s.dismissSuggestion)
	const setInput = useChatStore((s) => s.setInput)

	if (debouncedInput.trim().length < MIN_LEN) return null

	const all = suggestForQuery(lang, debouncedInput)
	const pending = all.filter(
		(s) => !dismissed?.has(`${debouncedInput}|${s.key}`)
	)
	if (pending.length === 0) return null

	const current = pending[0]
	const total = pending.length

	const accept = () => {
		setInput(lang, current.applied)
		dismissSuggestion(lang, debouncedInput, current.key)
	}
	const dismiss = () => {
		dismissSuggestion(lang, debouncedInput, current.key)
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
