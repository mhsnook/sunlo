import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Bubble } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { hasBlocks } from '../../../shared/blocks'
import {
	displayName,
	isCrewKey,
	speakerOf,
	type CrewMessageType,
} from '../../../shared/crew'
import { timeLabel } from '~/lib/format'
import { AgentAvatar, CrewText } from './crew-parts'
import { MessageRuns } from './run-steps'
import { SpeakableBubble } from './voice-controls'

// A side-thread, folded under the note that opened it: the favour one crew
// member asked of another, which only the two of them take part in.
export function SideThread({
	root,
	thread,
	replies,
}: {
	root: CrewMessageType
	thread: NonNullable<CrewMessageType['thread']>
	replies: Array<CrewMessageType>
}) {
	const [open, setOpen] = useState(false)
	const count = replies.filter((reply) => !reply.receipt).length
	return (
		<div className="space-y-2" data-testid="crew-thread" data-key={root.id}>
			<Button
				variant="ghost"
				size="sm"
				className="text-muted-foreground h-7 px-2 shadow-none"
				aria-expanded={open}
				data-testid="crew-thread-toggle"
				onClick={() => setOpen((on) => !on)}
			>
				<ChevronDown className={open ? 'rotate-180' : undefined} />
				Side-thread with {displayName(thread.with)} ·{' '}
				{count === 1 ? '1 reply' : `${count} replies`}
				{thread.closedAt ? ' · closed' : ''}
			</Button>
			{open && (
				<ol className="space-y-3 border-s-2 ps-3">
					{replies.map((reply) => (
						<li
							key={reply.id}
							className="flex gap-2"
							data-testid="crew-thread-reply"
							data-key={reply.id}
						>
							{isCrewKey(reply.author) && (
								<AgentAvatar agent={reply.author} size="sm" />
							)}
							<div className="min-w-0 space-y-1">
								<p className="text-muted-foreground text-xs">
									<span className="text-foreground font-semibold">
										{reply.authorName}
									</span>{' '}
									{timeLabel(reply.at)}
								</p>
								<SpeakableBubble
									id={reply.id}
									text={reply.body}
									agent={speakerOf(reply)}
									blocks={hasBlocks(reply.body)}
								>
									<Bubble
										variant="muted"
										align="start"
										className="min-w-0 whitespace-normal"
									>
										<CrewText text={reply.body} />
									</Bubble>
								</SpeakableBubble>
								<MessageRuns message={reply} />
							</div>
						</li>
					))}
					{!replies.length && (
						<li className="text-muted-foreground text-sm">No reply yet.</li>
					)}
				</ol>
			)}
		</div>
	)
}
