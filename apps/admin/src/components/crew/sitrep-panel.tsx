import { useSuspenseQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { crewList, type CrewKey } from '../../../shared/crew'
import { sitrepQuery, useSetSitrep } from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { AgentAvatar } from './crew-parts'
import { EditableEntry } from './editable-entry'

// Where each vertical stands, in a line per track, under Riker's note. Every
// agent reads it at the top of every run. Each vertical keeps its own lines,
// Riker may rewrite any, and the admin edits all of them here.
export function SitrepPanel({ onClose }: { onClose: () => void }) {
	const verticals = crewList.filter(
		(member) => member.key !== 'riker' && member.tracks.length
	)
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
				<section className="space-y-2">
					<h3 className="flex items-center gap-2 text-sm font-semibold">
						<AgentAvatar agent="riker" size="sm" /> Riker’s note
					</h3>
					<ul>
						<SitrepLine agent="riker" track="Note" showTrack={false} rows={6} />
					</ul>
				</section>
				{verticals.map((member) => (
					<section key={member.key} className="space-y-2">
						<h3 className="flex items-center gap-2 text-sm font-semibold">
							<AgentAvatar agent={member.key} size="sm" /> {member.name}
							{!member.active && (
								<span className="text-muted-foreground text-xs font-normal">
									not started yet
								</span>
							)}
						</h3>
						<ul className="space-y-2">
							{member.tracks.map((track) => (
								<SitrepLine
									key={track}
									agent={member.key}
									track={track}
									showTrack={member.tracks.length > 1}
								/>
							))}
						</ul>
					</section>
				))}
			</div>
		</aside>
	)
}

function SitrepLine({
	agent,
	track,
	showTrack,
	rows,
}: {
	agent: CrewKey
	track: string
	showTrack: boolean
	rows?: number
}) {
	const { data: lines } = useSuspenseQuery(sitrepQuery())
	const save = useSetSitrep()
	const line = lines.find(
		(entry) => entry.agent === agent && entry.track === track
	)
	const set = (text: string) => save.mutateAsync({ agent, track, text })
	return (
		<EditableEntry
			id={`${agent}/${track}`}
			text={line?.text ?? ''}
			label="Situation Report line"
			busy={save.isPending}
			onSave={set}
			onDelete={line ? () => set('') : undefined}
			deleteLabel="Clear this line"
			rows={rows}
			className="bg-card rounded border p-3"
			testId="sitrep-line"
		>
			{showTrack && (
				<span className="text-muted-foreground block text-xs font-semibold">
					{track}
				</span>
			)}
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
