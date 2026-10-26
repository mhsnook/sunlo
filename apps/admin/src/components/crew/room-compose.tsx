import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Layers, Loader2, MessageCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComposeBar } from '@/components/ui/compose-bar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toastError } from '@/components/ui/sonner'
import { useDebounce } from '@/hooks/use-debounce'
import {
	crewList,
	endsWithEllipsis,
	fixedRouting,
	type RoutingType,
} from '../../../shared/crew'
import { clefQuery, usePostToRoom } from '~/lib/crew'
import { routingNote } from './room-timeline'

const sameRouting = (a: RoutingType, b: RoutingType) =>
	a.kind === b.kind && a.agents.join() === b.agents.join()

export function RoomCompose() {
	const [draft, setDraft] = useState('')
	// The admin's own choice from the chip, which CLEF learns from.
	const [override, setOverride] = useState<RoutingType | null>(null)
	const post = usePostToRoom()

	const text = draft.trim()
	const rule = text ? fixedRouting(text) : null
	const settled = useDebounce(text, 600)
	const clef = useQuery({
		...clefQuery(settled),
		enabled: !!settled && !rule && settled === text,
	})
	const predicted = rule ?? (settled === text ? clef.data : undefined) ?? null
	// "..." always stacks; the chip cannot change that.
	const locked = !!text && endsWithEllipsis(text)
	const routing = locked ? predicted : (override ?? predicted)
	const deciding = !!text && !routing && (clef.isFetching || settled !== text)

	const send = (body: string) => {
		post.mutate(
			{
				body,
				routing,
				predicted:
					override && predicted && !sameRouting(override, predicted)
						? predicted
						: null,
			},
			{
				onSuccess: () => {
					setDraft('')
					setOverride(null)
				},
				onError: (error) => toastError(error.message),
			}
		)
	}

	const options: Array<{ routing: RoutingType; label: string }> = [
		...crewList
			.filter((member) => member.active)
			.map((member) => ({
				routing: {
					kind: 'route' as const,
					agents: [member.key],
					by: 'you' as const,
				},
				label: `Send to ${member.name}`,
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

	return (
		<div className="mx-auto w-full max-w-3xl space-y-1 px-4 pt-2 pb-3">
			{text && (
				<DropdownMenu>
					<DropdownMenuTrigger
						disabled={locked || deciding}
						data-testid="crew-clef-chip"
						className={cn(
							'bg-primary-50 text-primary-800 hover:bg-primary-100 ms-1 inline-flex items-center gap-1 rounded-2xl px-3 py-1 text-xs font-medium',
							(locked || deciding) && 'cursor-default'
						)}
					>
						{deciding ? (
							<>
								<Loader2 className="size-3 animate-spin" /> Deciding where this
								goes
							</>
						) : routing ? (
							<>
								{routing.kind === 'route' ? (
									<Send className="size-3" />
								) : routing.kind === 'room' ? (
									<MessageCircle className="size-3" />
								) : (
									<Layers className="size-3" />
								)}
								{routingNote(routing)}
								{!locked && <ChevronDown className="size-3" />}
							</>
						) : null}
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start">
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Where should this go?
						</DropdownMenuLabel>
						{options.map((option) => (
							<DropdownMenuItem
								key={option.label}
								data-testid="crew-clef-option"
								data-key={option.routing.kind + option.routing.agents.join()}
								onClick={() => setOverride(option.routing)}
							>
								{option.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
			<ComposeBar
				value={draft}
				onValueChange={(value) => {
					setDraft(value)
					if (!value.trim()) setOverride(null)
				}}
				onSend={send}
				busy={post.isPending}
				placeholder="Message the crew, or @ someone"
				inputTestId="crew-compose-input"
				sendTestId="crew-compose-send"
			/>
		</div>
	)
}
