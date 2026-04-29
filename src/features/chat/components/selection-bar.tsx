import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore, useChatRouteLang } from '../store'
import { useChatSearch, useChatSelection } from '../hooks'

export function SelectionBar() {
	const lang = useChatRouteLang()
	const selection = useChatSelection()
	const removeFromSelection = useChatStore((s) => s.removeFromSelection)
	const clearSelection = useChatStore((s) => s.clearSelection)
	const search = useChatSearch()

	if (selection.length === 0) return null

	const handlePivot = () => {
		const label = selection.map((p) => p.text).join(' / ')
		search.mutate({
			query: { kind: 'anchor', pids: selection.map((p) => p.id), label },
		})
	}

	return (
		<div
			data-testid="chat-selection-bar"
			className="bg-1-lo-primary flex flex-col gap-2 rounded border p-2"
		>
			<div className="flex flex-row items-center justify-between gap-2">
				<span className="text-muted-foreground text-xs font-medium">
					{selection.length} selected for next pivot
				</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					data-testid="chat-selection-clear-button"
					onClick={() => clearSelection(lang)}
				>
					Clear
				</Button>
			</div>

			<div className="flex flex-row flex-wrap gap-1">
				{selection.map((phrase) => (
					<span
						key={phrase.id}
						data-key={phrase.id}
						data-testid="chat-selection-chip"
						className="bg-card flex flex-row items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
					>
						<span lang={phrase.lang}>{phrase.text}</span>
						<button
							type="button"
							data-testid="chat-selection-remove-button"
							aria-label="Remove from selection"
							onClick={() => removeFromSelection(lang, phrase.id)}
							className="hover:text-foreground text-muted-foreground"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
			</div>

			<Button
				type="button"
				variant="soft"
				size="sm"
				data-testid="chat-pivot-button"
				disabled={search.isPending}
				onClick={handlePivot}
			>
				<Sparkles />
				More like these
			</Button>
		</div>
	)
}
