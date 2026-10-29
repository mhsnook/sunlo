import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { displayName, type CrewMessageType } from '../../../shared/crew'
import { timeLabel } from '~/lib/format'
import { CrewText } from './crew-parts'

// A side-thread, folded under the note that opened it: the favour one crew
// member asked of another, which only the two of them take part in.
export function SideThread({
	root,
	replies,
}: {
	root: CrewMessageType
	replies: Array<CrewMessageType>
}) {
	const [open, setOpen] = useState(false)
	if (!root.thread) return null
	const count = replies.filter((reply) => !reply.receipt).length
	return (
		<div className="space-y-2" data-testid="crew-thread" data-key={root.id}>
			<button
				type="button"
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1 text-xs"
				aria-expanded={open}
				data-testid="crew-thread-toggle"
				onClick={() => setOpen((on) => !on)}
			>
				<ChevronDown
					className={open ? 'size-3 rotate-180' : 'size-3'}
					aria-hidden
				/>
				Side-thread with {displayName(root.thread.with)} ·{' '}
				{count === 1 ? '1 reply' : `${count} replies`}
				{root.thread.closedAt ? ' · closed' : ''}
			</button>
			{open && (
				<ol className="space-y-2 border-s-2 ps-3">
					{replies.map((reply) => (
						<li
							key={reply.id}
							className="text-sm"
							data-testid="crew-thread-reply"
							data-key={reply.id}
						>
							<p className="text-muted-foreground text-xs">
								<span className="text-foreground font-semibold">
									{reply.authorName}
								</span>{' '}
								{timeLabel(reply.at)}
							</p>
							<CrewText text={reply.body} />
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
