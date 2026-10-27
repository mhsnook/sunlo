import { useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import type { CharterEntryType } from '../../../shared/crew'
import {
	enterpriseQuery,
	roomQuery,
	useEditCharter,
	useSetTimezone,
} from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { EditableEntry } from './editable-entry'

// What the Enterprise knows about the admin, in the ship's log. The admin
// edits it directly; Riker and Data can only propose entries.
export function CharterPanel() {
	const { data: thread } = useSuspenseQuery(enterpriseQuery())
	const kept = thread.charter.filter((entry) => entry.status === 'kept')
	const proposed = thread.charter.filter((entry) => entry.status === 'proposed')
	return (
		<section className="space-y-3" data-testid="charter-panel">
			<h2 className="text-muted-foreground text-sm font-semibold">
				The charter: what the Enterprise knows about you · {kept.length}
			</h2>
			{kept.length ? (
				<ul className="space-y-2">
					{kept.map((entry) => (
						<CharterEntry key={entry.id} entry={entry} />
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-sm">
					Nothing yet. Riker proposes principles and lessons as he learns how
					you decide, and they land here when you keep them.
				</p>
			)}
			{proposed.length > 0 && (
				<p className="text-muted-foreground text-sm">
					{proposed.length} more waiting for you in the thread.
				</p>
			)}
			<WeeklySettings />
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

function WeeklySettings() {
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
