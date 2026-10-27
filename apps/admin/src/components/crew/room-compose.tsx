import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Layers, Loader2, MessageCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComposeBar } from '@/components/ui/compose-bar'
import { toastError } from '@/components/ui/sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { fixedRouting, type RoutingType } from '../../../shared/crew'
import { clefQuery, usePostToRoom } from '~/lib/crew'
import { RoutingMenu, routingNote } from './routing-menu'

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
	// When CLEF fails, the message stays in the room, as the server decides too.
	const predicted =
		rule ??
		(settled === text ? clef.data : undefined) ??
		(clef.isError
			? { kind: 'room' as const, agents: [], by: 'model' as const }
			: null)
	// "..." always stacks; the chip cannot change that.
	const locked = rule?.kind === 'stack'
	const routing = locked ? predicted : (override ?? predicted)
	const deciding = !!text && !routing && (clef.isFetching || settled !== text)

	const send = (body: string) => {
		post.mutate(
			{
				body,
				routing,
				predicted,
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

	return (
		<div className="mx-auto w-full max-w-3xl space-y-1 px-4 pt-2 pb-3">
			{text && (
				<RoutingMenu
					label="Where should this go?"
					onChoose={setOverride}
					disabled={locked || deciding}
					testId="crew-clef-chip"
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
				</RoutingMenu>
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
