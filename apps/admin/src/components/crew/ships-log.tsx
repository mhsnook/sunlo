import { useSuspenseQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bridgeKeys, crew } from '../../../shared/crew'
import { workspaceQuery } from '~/lib/crew'
import { CharterPanel } from './charter-panel'
import { MemoryList } from './memory-list'
import { Empty, Section, TodoList } from './workspace-parts'

// The Enterprise's workspace beside its thread: the charter, then Riker's
// and Data's to-dos and memory, which includes Data's playbook.
export function ShipsLog({ onClose }: { onClose: () => void }) {
	return (
		<aside
			aria-label="Ship’s log"
			data-testid="enterprise-log"
			className="bg-background flex h-full w-full flex-col border-s md:w-96"
		>
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<h2 className="me-auto font-semibold">Ship’s log</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Close the ship’s log"
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			<div className="flex-1 space-y-8 overflow-y-auto px-4 py-4">
				<CharterPanel />
				{bridgeKeys.map((agent) => (
					<OfficerLog key={agent} agent={agent} />
				))}
			</div>
		</aside>
	)
}

function OfficerLog({ agent }: { agent: (typeof bridgeKeys)[number] }) {
	const { data: workspace } = useSuspenseQuery(workspaceQuery(agent))
	const name = crew[agent].name
	return (
		<div
			className="space-y-5"
			data-testid="enterprise-officer"
			data-key={agent}
		>
			<Section title={`${name}'s to-dos`}>
				{workspace.todos.length ? (
					<TodoList todos={workspace.todos} />
				) : (
					<Empty>Nothing on {name}'s list.</Empty>
				)}
			</Section>
			<MemoryList agent={agent} memory={workspace.memory} />
		</div>
	)
}
