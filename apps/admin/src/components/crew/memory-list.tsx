import type { ReactNode } from 'react'
import { crew, type CrewKey, type MemoryType } from '../../../shared/crew'
import { useEditMemory, useForgetMemory } from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { EditableEntry } from './editable-entry'

// An agent's memory, which the admin can edit and prune. Data's playbook entries
// (metrics by domain, chart preferences) get their own headings.
export function MemoryList({
	agent,
	memory,
}: {
	agent: CrewKey
	memory: Array<MemoryType>
}) {
	const metrics = memory.filter((entry) => entry.kind === 'metric')
	const charts = memory.filter((entry) => entry.kind === 'chart')
	const facts = memory.filter((entry) => entry.kind === 'fact')
	const domains = [
		...new Set(metrics.map((entry) => entry.domain ?? 'General')),
	]
	return (
		<div className="space-y-5">
			{metrics.length > 0 && (
				<Group title="The metrics you like">
					{domains.map((domain) => (
						<div key={domain} className="space-y-1">
							<p className="text-xs font-semibold">{domain}</p>
							<Entries
								agent={agent}
								entries={metrics.filter(
									(entry) => (entry.domain ?? 'General') === domain
								)}
							/>
						</div>
					))}
				</Group>
			)}
			{charts.length > 0 && (
				<Group title="How you like charts">
					<Entries agent={agent} entries={charts} />
				</Group>
			)}
			<Group title={`What ${crew[agent].name} remembers`}>
				{facts.length ? (
					<Entries agent={agent} entries={facts} />
				) : (
					<p className="text-muted-foreground text-sm">
						{crew[agent].name} has not saved anything yet.
					</p>
				)}
			</Group>
		</div>
	)
}

function Group({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="space-y-2">
			<h2 className="text-muted-foreground text-sm font-semibold">{title}</h2>
			{children}
		</section>
	)
}

function Entries({
	agent,
	entries,
}: {
	agent: CrewKey
	entries: Array<MemoryType>
}) {
	const edit = useEditMemory(agent)
	const forget = useForgetMemory(agent)
	return (
		<ul className="space-y-1" data-testid="agent-memory">
			{entries.map((entry) => (
				<EditableEntry
					key={entry.id}
					id={entry.id}
					text={entry.text}
					label="Memory"
					busy={edit.isPending || forget.isPending}
					onSave={(text) => edit.mutateAsync({ id: entry.id, text })}
					onDelete={() => forget.mutateAsync(entry.id)}
					deleteLabel="Delete this memory"
					quiet
					testId="agent-memory-entry"
				>
					{entry.text}
					<span className="text-muted-foreground ms-2 text-xs">
						{dayLabel(entry.at)}
					</span>
				</EditableEntry>
			))}
		</ul>
	)
}
