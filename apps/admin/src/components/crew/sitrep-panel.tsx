import { useSuspenseQuery } from '@tanstack/react-query'
import { sitrepQuery, useSetSitrep } from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { CrewText } from './crew-parts'
import { EditableEntry } from './editable-entry'
import { SidePanel } from './side-panel'

// Where Sunlo and each room stand now, in one document. Every agent reads it
// at the top of every run; Riker and the admin write it.
export function SitrepPanel({ onClose }: { onClose: () => void }) {
	const { data: sitrep } = useSuspenseQuery(sitrepQuery())
	const save = useSetSitrep()
	return (
		<SidePanel title="Situation Report" testId="sitrep" onClose={onClose}>
			<EditableEntry
				id="sitrep"
				text={sitrep?.text ?? ''}
				label="Situation Report"
				busy={save.isPending}
				onSave={(text) => save.mutateAsync(text)}
				onDelete={sitrep ? () => save.mutateAsync('') : undefined}
				deleteLabel="Clear the report"
				rows={16}
				className="bg-card rounded border p-3 text-sm"
				testId="sitrep-text"
			>
				{sitrep ? (
					<>
						<CrewText text={sitrep.text} />
						<span className="text-muted-foreground mt-2 block text-xs">
							{sitrep.byName}, {dayLabel(sitrep.at)}
						</span>
					</>
				) : (
					<span className="text-muted-foreground">
						Nobody has written it yet. Riker keeps it, and you can write it
						here.
					</span>
				)}
			</EditableEntry>
		</SidePanel>
	)
}
