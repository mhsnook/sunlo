import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'
import { Bubble } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import { MessageScroller } from '@/components/ui/message-scroller'
import languages from '@/lib/languages'
import { cn } from '@/lib/utils'
import {
	OPENING_REPLIES,
	openingLine,
	type CoachLogEntry,
} from '../conversation'
import { usePageState } from '../store'

type Props = {
	coachKey: string
	lang: string
	learnerName: string | null
	deckSize: number
	log: Array<CoachLogEntry>
	suggestions: Array<string>
	started: boolean
	busy: boolean
	send: (text: string) => void
	startOver: () => void
}

export function CoachChat({
	coachKey,
	lang,
	learnerName,
	deckSize,
	log,
	suggestions,
	started,
	busy,
	send,
	startOver,
}: Props) {
	const [draft, setDraft] = useState('')
	const { notes } = usePageState(coachKey)
	const replies = started ? suggestions : OPENING_REPLIES

	return (
		<div className="flex h-full min-h-0 flex-col gap-3 p-4">
			<header className="flex items-center justify-between gap-2">
				<Link to="/learn" className="text-lg font-bold">
					sunlo
				</Link>
				<span className="text-muted-foreground text-sm">
					Coach · {languages[lang] ?? lang}
				</span>
				<Button
					variant="ghost"
					size="icon"
					title="Start over"
					aria-label="Start over"
					data-testid="coach-reset"
					disabled={busy || !started}
					onClick={startOver}
				>
					<RotateCcw />
				</Button>
			</header>

			<MessageScroller
				dependency={log.length + notes.length + (busy ? 1 : 0)}
				data-testid="coach-log"
				className="min-h-0 flex-1"
			>
				<div className="flex flex-col gap-3 pe-1">
					{started ? (
						log.map((entry) => <LogEntry key={entry.id} entry={entry} />)
					) : (
						<Bubble variant="soft" align="start">
							{openingLine(learnerName, lang, deckSize)}
						</Bubble>
					)}
					{notes.map((note) => (
						<LogEntry key={note.id} entry={{ ...note, kind: 'action' }} />
					))}
					{busy && (
						<Bubble
							variant="soft"
							align="start"
							className="animate-pulse"
							data-testid="coach-thinking"
						>
							…
						</Bubble>
					)}
				</div>
			</MessageScroller>

			{!busy && replies.length > 0 && (
				<div className="flex flex-wrap gap-2" data-testid="coach-suggestions">
					{replies.map((reply) => (
						<Button
							key={reply}
							variant="badge-outline"
							size="sm"
							data-testid="coach-suggestion"
							data-key={reply}
							onClick={() => send(reply)}
						>
							{reply}
						</Button>
					))}
				</div>
			)}

			<ComposeBar
				value={draft}
				onValueChange={setDraft}
				onSend={(text) => {
					send(text)
					setDraft('')
				}}
				busy={busy}
				placeholder="Tell your coach what you want to learn"
				inputLabel="Message your coach"
				inputTestId="coach-input"
				sendTestId="coach-send"
			/>
		</div>
	)
}

function LogEntry({ entry }: { entry: CoachLogEntry }) {
	switch (entry.kind) {
		case 'learner':
			return (
				<Bubble
					variant="primary"
					align="end"
					data-testid="coach-learner-message"
				>
					{entry.text}
				</Bubble>
			)
		case 'coach':
			return (
				<Bubble variant="soft" align="start" data-testid="coach-message">
					{entry.text}
				</Bubble>
			)
		case 'action':
		case 'error':
			return (
				<p
					data-testid={`coach-${entry.kind}`}
					className={cn(
						'flex items-center gap-2 text-xs',
						entry.kind === 'error' ? 'text-danger-700' : 'text-muted-foreground'
					)}
				>
					<span
						aria-hidden
						className={cn(
							'size-1.5 shrink-0 rounded-full',
							entry.kind === 'error' ? 'bg-danger-500' : 'bg-primary-500'
						)}
					/>
					{entry.text}
				</p>
			)
	}
}
