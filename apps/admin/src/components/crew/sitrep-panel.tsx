import { useSuspenseQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { roomKeys, roomNames, type RoomKey } from '../../../shared/crew'
import { sitrepQuery, useSetSitrep } from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { RoomAvatar } from './crew-parts'
import { EditableEntry } from './editable-entry'

// Where each room's subject stands, one line per room, under Riker's note,
// which is the Command room's line. Every agent reads it at the top of every
// run. Each room's officers keep its line, Riker may rewrite any, and the
// admin edits all of them here.
export function SitrepPanel({ onClose }: { onClose: () => void }) {
	return (
		<aside
			aria-label="Situation Report"
			data-testid="sitrep"
			className="bg-background flex h-full w-full flex-col border-s md:w-96"
		>
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<h2 className="me-auto font-semibold">Situation Report</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Close the Situation Report"
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			<div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
				{roomKeys.map((room) => (
					<section key={room} className="space-y-2">
						<h3 className="flex items-center gap-2 text-sm font-semibold">
							<RoomAvatar room={room} size="sm" />
							{room === 'command' ? 'Riker’s note' : roomNames[room]}
						</h3>
						<ul>
							<SitrepLine room={room} />
						</ul>
					</section>
				))}
			</div>
		</aside>
	)
}

export function SitrepLine({ room }: { room: RoomKey }) {
	const { data: lines } = useSuspenseQuery(sitrepQuery())
	const save = useSetSitrep()
	const line = lines.find((entry) => entry.room === room)
	const set = (text: string) => save.mutateAsync({ room, text })
	return (
		<EditableEntry
			id={room}
			text={line?.text ?? ''}
			label="Situation Report line"
			busy={save.isPending}
			onSave={set}
			onDelete={line ? () => set('') : undefined}
			deleteLabel="Clear this line"
			rows={room === 'command' ? 6 : 3}
			className="bg-card rounded border p-3 whitespace-pre-line"
			testId="sitrep-line"
		>
			{line ? (
				<>
					{line.text}
					<span className="text-muted-foreground block text-xs">
						{line.byName}, {dayLabel(line.at)}
					</span>
				</>
			) : (
				<span className="text-muted-foreground">No report yet.</span>
			)}
		</EditableEntry>
	)
}
