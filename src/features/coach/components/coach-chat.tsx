import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bubble } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import { MessageScroller } from '@/components/ui/message-scroller'
import { useSetGuestSignup } from '@/components/guest-signup/reasons'
import languages from '@/lib/languages'
import { cn } from '@/lib/utils'
import {
	OPENING_REPLIES,
	openingLine,
	type CoachLogEntry,
} from '../conversation'
import { usePageState } from '../store'
import { GuestChoice } from './guest-choice'

type Props = {
	coachKey: string
	lang: string
	learnerName: string | null
	deckSize: number
	log: Array<CoachLogEntry>
	suggestions: Array<string>
	// The coach offered a guest an account in its last turn.
	offersAccount: boolean
	ready: boolean
	started: boolean
	busy: boolean
	// Set for a visitor with no uid yet: the chat asks them to log in or
	// continue as a guest before it takes a message.
	guest: { joining: boolean; join: () => void } | null
	send: (text: string) => void
}

export function CoachChat({
	coachKey,
	lang,
	learnerName,
	deckSize,
	log,
	suggestions,
	offersAccount,
	ready,
	started,
	busy,
	guest,
	send,
}: Props) {
	const [draft, setDraft] = useState('')
	const { notes } = usePageState(coachKey)
	const setGuestSignup = useSetGuestSignup()
	const replies = !ready ? [] : started ? suggestions : OPENING_REPLIES

	return (
		<div className="flex h-full min-h-0 flex-col gap-3 p-4">
			<header className="flex items-center justify-between gap-2">
				<Link to="/learn" className="text-lg font-bold">
					sunlo
				</Link>
				<span className="text-muted-foreground text-sm">
					Coach · {languages[lang] ?? lang}
				</span>
			</header>

			<MessageScroller
				dependency={log.length + notes.length + (busy ? 1 : 0)}
				data-testid="coach-log"
				className="min-h-0 flex-1"
			>
				<div className="flex flex-col gap-3 pe-1">
					{!ready ? (
						<p
							className="text-muted-foreground text-sm"
							data-testid="coach-loading"
						>
							Loading your conversation…
						</p>
					) : started ? (
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

			{guest ? (
				<GuestChoice joining={guest.joining} onGuest={guest.join} />
			) : null}

			{!guest && !busy && (replies.length > 0 || offersAccount) && (
				<div className="flex flex-wrap gap-2" data-testid="coach-suggestions">
					{offersAccount ? (
						<Button
							size="sm"
							data-testid="coach-create-account"
							onClick={() => setGuestSignup('coach')}
						>
							Create my profile
						</Button>
					) : null}
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

			{guest ? null : (
				<ComposeBar
					value={draft}
					onValueChange={setDraft}
					onSend={(text) => {
						send(text)
						setDraft('')
					}}
					busy={busy || !ready}
					placeholder="Tell your coach what you want to learn"
					inputLabel="Message your coach"
					inputTestId="coach-input"
					sendTestId="coach-send"
				/>
			)}
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
					data-busy={entry.busy || undefined}
					className={cn(
						'flex items-center gap-2 text-xs',
						entry.kind === 'error' ? 'text-danger-700' : 'text-muted-foreground'
					)}
				>
					<span
						aria-hidden
						className={cn(
							'size-1.5 shrink-0 rounded-full',
							entry.kind === 'error' ? 'bg-danger-500' : 'bg-primary-500',
							entry.busy && 'animate-pulse'
						)}
					/>
					{entry.text}
				</p>
			)
	}
}
