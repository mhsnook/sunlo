import { useState } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import type { CharterEntryType } from '../../../shared/crew'
import {
	roomQuery,
	stackQuery,
	useEditCharter,
	useSetTimezone,
} from '~/lib/crew'
import { dayLabel } from '~/lib/format'

// What the bridge knows about the admin, on Riker's workspace page. The
// admin edits it directly; agents can only propose entries.
export function CharterPanel() {
	const { data: stack } = useSuspenseQuery(stackQuery())
	const kept = stack.charter.filter((entry) => entry.status === 'kept')
	const proposed = stack.charter.filter((entry) => entry.status === 'proposed')
	return (
		<section className="space-y-3" data-testid="charter-panel">
			<h2 className="text-muted-foreground text-sm font-semibold">
				What the bridge knows about you · {kept.length}
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
					{proposed.length} more waiting for you in “Brought to you”.
				</p>
			)}
			<WeeklySettings />
		</section>
	)
}

function CharterEntry({ entry }: { entry: CharterEntryType }) {
	const edit = useEditCharter()
	const [draft, setDraft] = useState<string | null>(null)
	const save = (change: { text?: string; status?: 'dropped' }) =>
		edit.mutate(
			{ id: entry.id, ...change },
			{
				onSuccess: () => setDraft(null),
				onError: (error) => toastError(error.message),
			}
		)
	return (
		<li
			className="bg-card flex items-start gap-2 rounded border p-3 text-sm"
			data-testid="charter-entry"
			data-key={entry.id}
		>
			<span className="text-muted-foreground w-16 shrink-0 text-xs capitalize">
				{entry.kind}
			</span>
			{draft === null ? (
				<span className="flex-1">
					{entry.text}
					{entry.keptAt && (
						<span className="text-muted-foreground ms-2 text-xs">
							kept {dayLabel(entry.keptAt)}
						</span>
					)}
				</span>
			) : (
				<Input
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					className="flex-1"
					aria-label="Charter entry"
				/>
			)}
			{draft === null ? (
				<>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Edit this entry"
						onClick={() => setDraft(entry.text)}
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Drop this entry"
						disabled={edit.isPending}
						onClick={() => save({ status: 'dropped' })}
					>
						<Trash2 />
					</Button>
				</>
			) : (
				<>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Save"
						disabled={edit.isPending || !draft.trim()}
						onClick={() => save({ text: draft.trim() })}
					>
						<Check />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Cancel"
						onClick={() => setDraft(null)}
					>
						<X />
					</Button>
				</>
			)}
		</li>
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
