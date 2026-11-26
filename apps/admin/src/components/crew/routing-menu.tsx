import type { ReactNode } from 'react'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	activeCrew,
	crewNames,
	displayName,
	type RoutingType,
} from '../../../shared/crew'

export function routingNote(routing: RoutingType) {
	if (routing.kind === 'stack') return 'Stacked with your next message'
	if (routing.kind === 'room') return 'Left in the room'
	if (routing.kind === 'everyone') {
		return `To everyone, sent to ${crewNames(routing.agents)}`
	}
	return `Sent to ${crewNames(routing.agents)}`
}

const leaveInRoom = {
	routing: { kind: 'room', agents: [], by: 'you' },
	label: 'Leave in the room',
} satisfies { routing: RoutingType; label: string }

const routingOptions: Array<{ routing: RoutingType; label: string }> = [
	...activeCrew.map((key) => ({
		routing: { kind: 'route' as const, agents: [key], by: 'you' as const },
		label: `Send to ${displayName(key)}`,
	})),
	{
		routing: { kind: 'everyone', agents: activeCrew, by: 'you' },
		label: 'Send to everyone',
	},
	leaveInRoom,
	{
		routing: { kind: 'stack', agents: [], by: 'you' },
		label: 'Stack with my next message',
	},
]

// Where a message goes: the compose chip before sending, and the routing
// note under a sent message, for correcting CLEF afterwards. A sent message
// to everyone, or one that woke several agents, gets a check for each agent
// instead.
export function RoutingMenu({
	label,
	onChoose,
	current,
	disabled = false,
	includeStack = true,
	className,
	testId,
	children,
}: {
	label: string
	onChoose: (routing: RoutingType) => void
	current?: RoutingType
	disabled?: boolean
	// A sent message cannot stack: the next message has already gone.
	includeStack?: boolean
	className?: string
	testId: string
	children: ReactNode
}) {
	const several =
		current?.kind === 'everyone' ||
		(current?.kind === 'route' && current.agents.length > 1)
			? current
			: null
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={disabled}
				data-testid={testId}
				className={className}
			>
				{children}
			</DropdownMenuTrigger>
			<DropdownMenuContent side="top" align="start">
				<DropdownMenuLabel className="text-muted-foreground text-xs">
					{label}
				</DropdownMenuLabel>
				{several ? (
					<>
						{activeCrew.map((key) => (
							<DropdownMenuCheckboxItem
								key={key}
								data-testid="crew-routing-everyone-option"
								data-key={key}
								checked={several.agents.includes(key)}
								// Each check sends a correction at once, so a second check
								// in the same open menu would start from a stale list.
								closeOnClick
								onCheckedChange={(checked) =>
									onChoose({
										kind: several.kind,
										agents: checked
											? [...several.agents, key]
											: several.agents.filter((agent) => agent !== key),
										by: 'you',
									})
								}
							>
								{displayName(key)}
							</DropdownMenuCheckboxItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							data-testid="crew-routing-option"
							data-key={leaveInRoom.routing.kind}
							onClick={() => onChoose(leaveInRoom.routing)}
						>
							{leaveInRoom.label}
						</DropdownMenuItem>
					</>
				) : (
					routingOptions
						.filter((option) => includeStack || option.routing.kind !== 'stack')
						.map((option) => (
							<DropdownMenuItem
								key={option.label}
								data-testid="crew-routing-option"
								data-key={option.routing.kind + option.routing.agents.join()}
								onClick={() => onChoose(option.routing)}
							>
								{option.label}
							</DropdownMenuItem>
						))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
