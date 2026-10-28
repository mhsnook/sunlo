import type { ReactNode } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { crewList, displayName, type RoutingType } from '../../../shared/crew'

export function routingNote(routing: RoutingType) {
	if (routing.kind === 'stack') return 'Stacked with your next message'
	if (routing.kind === 'room') return 'Left in the room'
	return `Sent to ${routing.agents.map(displayName).join(' and ')}`
}

const routingOptions: Array<{ routing: RoutingType; label: string }> = [
	...crewList
		.filter((member) => member.active)
		.map((member) => ({
			routing: {
				kind: 'route' as const,
				agents: [member.key],
				by: 'you' as const,
			},
			label: `Send to ${displayName(member.key)}`,
		})),
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
// note under a sent message, for correcting CLEF afterwards.
export function RoutingMenu({
	label,
	onChoose,
	disabled = false,
	includeStack = true,
	className,
	testId,
	children,
}: {
	label: string
	onChoose: (routing: RoutingType) => void
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
				{routingOptions
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
					))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
