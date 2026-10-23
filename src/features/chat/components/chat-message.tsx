import { Sparkles } from 'lucide-react'

import type { ChatTurnType } from '../schemas'
import { PhraseResultCard } from './phrase-result-card'
import { Bubble } from '@/components/ui/bubble'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageGroup,
} from '@/components/ui/message'

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
			<Message align="end">
				<MessageContent>
					<Bubble
						variant="soft"
						align="end"
						data-testid="chat-user-message"
						className={turn.query.kind === 'text' ? undefined : 'italic'}
					>
						{turn.query.kind === 'text'
							? turn.query.text
							: `More like: ${turn.query.label}`}
					</Bubble>
				</MessageContent>
			</Message>

			<Message align="start" data-testid="chat-assistant-message">
				{/* A results answer runs several cards tall, so the avatar reads
				    better beside the first one than beside the last. */}
				<MessageAvatar className="self-start">
					<span className="bg-accent-100 text-accent-800 flex size-8 items-center justify-center rounded-lg">
						<Sparkles className="size-4" />
					</span>
				</MessageAvatar>
				<MessageContent>
					{isPending ? (
						<Bubble variant="muted" data-testid="chat-pending">
							Thinking…
						</Bubble>
					) : turn.results!.length === 0 ? (
						<Bubble variant="muted" data-testid="chat-empty-results">
							No matches yet — try rephrasing.
						</Bubble>
					) : (
						<MessageGroup data-testid="chat-result-list" className="gap-2">
							{turn.results!.map((phrase) => (
								<Bubble key={phrase.id} variant="ghost">
									<PhraseResultCard phrase={phrase} />
								</Bubble>
							))}
						</MessageGroup>
					)}
				</MessageContent>
			</Message>
		</div>
	)
}
