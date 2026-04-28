import type { ChatTurnType } from '../schemas'
import { PhraseResultCard } from './phrase-result-card'

type Props = {
	turn: ChatTurnType
}

export function ChatTurnView({ turn }: Props) {
	const isPending = turn.results === null

	return (
		<div
			data-testid="chat-turn"
			data-key={turn.id}
			data-pending={isPending ? '' : undefined}
			className="flex flex-col gap-3"
		>
			<div className="flex justify-end">
				<div
					data-testid="chat-user-message"
					className="bg-1-mlo-primary text-foreground max-w-[85%] rounded-2xl px-4 py-2 text-sm"
				>
					{turn.query.kind === 'text' ? (
						turn.query.text
					) : (
						<span className="italic">More like: {turn.query.label}</span>
					)}
				</div>
			</div>

			<div data-testid="chat-assistant-message" className="flex flex-col gap-2">
				{isPending ? (
					<div
						data-testid="chat-pending"
						className="text-muted-foreground text-sm"
					>
						Thinking…
					</div>
				) : turn.results!.length === 0 ? (
					<div
						data-testid="chat-empty-results"
						className="text-muted-foreground text-sm"
					>
						No matches yet — try rephrasing.
					</div>
				) : (
					<div data-testid="chat-result-list" className="flex flex-col gap-2">
						{turn.results!.map((phrase) => (
							<PhraseResultCard key={phrase.id} phrase={phrase} />
						))}
					</div>
				)}
			</div>
		</div>
	)
}
