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
	crewList,
	displayName,
	type CrewKey,
	type RoutingType,
} from '../../../shared/crew'

const names = (agents: Array<CrewKey>) =>
	new Intl.ListFormat('en', { type: 'conjunction' }).format(
		agents.map(displayName)
	)

export function routingNote(routing: RoutingType) {
	if (routing.kind === 'stack') return 'Stacked with your next message'
	if (routing.kind === 'room') return 'Left in the room'
	if (routing.kind === 'everyone') {
		return `To everyone, sent to ${names(routing.agents)}`
	}
	return `Sent to ${names(routing.agents)}`
}

const activeKeys = crewList
	.filter((member) => member.active)
	.map((member) => member.key)

const routingOptions: Array<{ routing: RoutingType; label: string }> = [
	...activeKeys.map((key) => ({
		routing: { kind: 'route' as const, agents: [key], by: 'you' as const },
		label: `Send to ${displayName(key)}`,
	})),
	{
		routing: { kind: 'everyone', agents: activeKeys, by: 'you' },
		label: 'Send to everyone',
	},
	{
		routing: { kind: 'room', agents: [], by: 'you' },
		label: 'Leave in the room',
	},
	{
		routing: { kind: 'stack', agents: [], by: 'you' },
		label: 'Stack with my next message',
	},
]

// Where a message goes: the compose chip before sending, and the routing
// note under a sent message, for correcting CLEF afterwards. For a message
// to everyone (`everyone`, the agents it sends to now), the menu has a
// check for each agent instead of one choice each.
export function RoutingMenu({
	label,
	onChoose,
	everyone,
	disabled = false,
	includeStack = true,
	className,
	testId,
	children,
}: {
	label: string
	onChoose: (routing: RoutingType) => void
	everyone?: Array<CrewKey>
	disabled?: boolean
	// A sent message cannot stack: the next message has already gone.
	includeStack?: boolean
	className?: string
	testId: string
	children: ReactNode
}) {
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
				{everyone ? (
					<>
						{activeKeys.map((key) => (
							<DropdownMenuCheckboxItem
								key={key}
								data-testid="crew-routing-everyone-option"
								data-key={key}
								checked={everyone.includes(key)}
								// Each check sends a correction at once, so a second check
								// in the same open menu would start from a stale list.
								closeOnClick
								onCheckedChange={(checked) =>
									onChoose({
										kind: 'everyone',
										agents: checked
											? [...everyone, key]
											: everyone.filter((agent) => agent !== key),
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
							data-key="room"
							onClick={() => onChoose({ kind: 'room', agents: [], by: 'you' })}
						>
							Leave in the room
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
