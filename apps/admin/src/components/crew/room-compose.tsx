import { useState } from 'react'
import {
	ChevronDown,
	Layers,
	MessageCircle,
	Send,
	Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComposeBar } from '@/components/ui/compose-bar'
import { toastError } from '@/components/ui/sonner'
import { fixedRouting, type RoutingType } from '../../../shared/crew'
import { usePostToRoom } from '~/lib/crew'
import { VoiceControls } from './voice-controls'
import { AttachImageButton, DraftImageStrip, useDraftImages } from './images'
import { RoutingMenu, routingNote } from './routing-menu'

// While the admin types, the chip shows only what is certain: "..." stacks
// and an @mention routes. Otherwise CLEF decides when the message is sent,
// unless the admin picks a place from the chip first.
export function RoomCompose({ myAuthor }: { myAuthor: string }) {
	const [draft, setDraft] = useState('')
	// The admin's own choice from the chip, which CLEF learns from.
	const [override, setOverride] = useState<RoutingType | null>(null)
	const post = usePostToRoom(myAuthor)
	const draftImages = useDraftImages()

	const text = draft.trim()
	const rule = text ? fixedRouting(text) : null
	// "..." always stacks; the chip cannot change that.
	const locked = rule?.kind === 'stack'
	const routing = locked ? rule : (override ?? rule)

	// The box clears at once; a refused message comes back into it, unless
	// the admin has started the next one.
	const send = (body: string) => {
		const chosen = override && !locked ? override : null
		const images = draftImages.take()
		setDraft('')
		setOverride(null)
		post.mutate(
			{ body, images, routing: chosen },
			{
				onError: (error) => {
					toastError(error.message)
					setDraft((current) => current || body)
					draftImages.restore(images)
				},
			}
		)
	}

	return (
		<div className="mx-auto w-full max-w-3xl space-y-1 px-4 pt-2 pb-3">
			{text && (
				<RoutingMenu
					label="Where should this go?"
					onChoose={setOverride}
					disabled={locked}
					testId="crew-clef-chip"
					className={cn(
						'bg-primary-50 text-primary-800 hover:bg-primary-100 ms-1 inline-flex items-center gap-1 rounded-2xl px-3 py-1 text-xs font-medium',
						locked && 'cursor-default'
					)}
				>
					{routing ? (
						<>
							{routing.kind === 'route' ? (
								<Send className="size-3" />
							) : routing.kind === 'room' ? (
								<MessageCircle className="size-3" />
							) : (
								<Layers className="size-3" />
							)}
							{routingNote(routing)}
						</>
					) : (
						<>
							<Sparkles className="size-3" /> CLEF decides when you send
						</>
					)}
					{!locked && <ChevronDown className="size-3" />}
				</RoutingMenu>
			)}
			<ComposeBar
				value={draft}
				onValueChange={(value) => {
					setDraft(value)
					if (!value.trim()) setOverride(null)
				}}
				onSend={send}
				{...draftImages.formProps}
				busy={draftImages.adding > 0}
				canSendEmpty={draftImages.images.length > 0}
				topSlot={
					<DraftImageStrip
						images={draftImages.images}
						adding={draftImages.adding}
						onRemove={draftImages.remove}
					/>
				}
				startSlot={
					<>
						<AttachImageButton onFiles={draftImages.add} />
						<VoiceControls setDraft={setDraft} />
					</>
				}
				placeholder="Message the crew, or @ someone"
				inputTestId="crew-compose-input"
				sendTestId="crew-compose-send"
			/>
		</div>
	)
}
