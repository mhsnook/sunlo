import { useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	displayName,
	principalOf,
	roomNames,
	type CharterEntryType,
	type RoomKey,
} from '../../../shared/crew'
import {
	charterQuery,
	roomQuery,
	useAddCharter,
	useEditCharter,
	useSetTimezone,
} from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { EditableEntry } from './editable-entry'
import { AddEntry } from './workspace-parts'

// What a room knows about the admin, in its room log. The admin writes and
// edits it directly; the room's officers can only propose entries.
export function CharterPanel({ room }: { room: RoomKey }) {
	const { data: charter } = useSuspenseQuery(charterQuery(room))
	const add = useAddCharter(room)
	const kept = charter.filter((entry) => entry.status === 'kept')
	const proposed = charter.filter((entry) => entry.status === 'proposed')
	return (
		<section className="space-y-3" data-testid="charter-panel" data-key={room}>
			<h2 className="text-muted-foreground text-sm font-semibold">
				The charter: what the {roomNames[room]} knows about you · {kept.length}
			</h2>
			{kept.length ? (
				<ul className="space-y-2">
					{kept.map((entry) => (
						<CharterEntry key={entry.id} entry={entry} />
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-sm">
					Nothing yet. {displayName(principalOf(room))} proposes principles and
					lessons as it learns how you decide, and they land here when you keep
					them.
				</p>
			)}
			{proposed.length > 0 && (
				<p className="text-muted-foreground text-sm">
					{proposed.length} more waiting for you in the room.
				</p>
			)}
			<AddEntry
				placeholder="Something about how you decide, or what you value"
				label="Add a charter entry"
				buttons={[
					{
						label: 'Add a principle',
						onAdd: (text) => add.mutateAsync({ kind: 'principle', text }),
					},
					{
						label: 'Add a lesson',
						onAdd: (text) => add.mutateAsync({ kind: 'lesson', text }),
					},
				]}
				busy={add.isPending}
				testId="charter-add"
			/>
		</section>
	)
}

function CharterEntry({ entry }: { entry: CharterEntryType }) {
	const edit = useEditCharter()
	return (
		<EditableEntry
			id={entry.id}
			text={entry.text}
			label="Charter entry"
			leading={
				<span className="text-muted-foreground w-16 shrink-0 text-xs capitalize">
					{entry.kind}
				</span>
			}
			busy={edit.isPending}
			onSave={(text) => edit.mutateAsync({ id: entry.id, text })}
			onDelete={() => edit.mutateAsync({ id: entry.id, status: 'dropped' })}
			deleteLabel="Drop this entry"
			className="bg-card rounded border p-3"
			testId="charter-entry"
		>
			{entry.text}
			{entry.keptAt && (
				<span className="text-muted-foreground ms-2 text-xs">
					kept {dayLabel(entry.keptAt)}
				</span>
			)}
		</EditableEntry>
	)
}

const timezones =
	typeof Intl.supportedValuesOf === 'function'
		? Intl.supportedValuesOf('timeZone')
		: []

export function WeeklySettings() {
	const { data: room } = useQuery(roomQuery())
	const setTimezone = useSetTimezone()
	const [draft, setDraft] = useState<string | null>(null)
	const current = room?.weekly.timezone ?? ''
	const value = draft ?? current
	return (
		<form
			className="flex flex-wrap items-center gap-2 pt-2 text-sm"
			onSubmit={(event) => {
				event.preventDefault()
				setTimezone.mutate(value, {
					onSuccess: () => {
						setDraft(null)
						toastSuccess('Time zone saved')
					},
					onError: (error) => toastError(error.message),
				})
			}}
		>
			<label htmlFor="brief-timezone" className="text-muted-foreground">
				The weekly brief comes on Sunday at 04:00 in
			</label>
			<Input
				id="brief-timezone"
				list="brief-timezones"
				value={value}
				onChange={(event) => setDraft(event.target.value)}
				className="w-56"
				data-testid="brief-timezone"
			/>
			<datalist id="brief-timezones">
				{timezones.map((zone) => (
					<option key={zone} value={zone}>
						{zone}
					</option>
				))}
			</datalist>
			{draft !== null && draft !== current && (
				<Button size="sm" type="submit" disabled={setTimezone.isPending}>
					Save
				</Button>
			)}
		</form>
	)
}
