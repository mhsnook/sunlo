import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import { toastError } from '@/components/ui/sonner'
import {
	associatesOf,
	displayName,
	handleOf,
	meetingDue,
	principalOf,
	type RoomKey,
	type WeeklyType,
} from '../../../shared/crew'
import { commandQuery, usePostToThread, useStartMeeting } from '~/lib/crew'
import { VoiceControls } from './voice-controls'
import { AttachImageButton, DraftImageStrip, useDraftImages } from './images'

// The officer who runs the room answers unless the message names someone
// who works there with them. In the Command room, while the weekly meeting
// is due and not yet started, one tap starts it.
export function RoomThreadCompose({
	room,
	weekly,
	myAuthor,
}: {
	room: RoomKey
	weekly: WeeklyType
	myAuthor: string
}) {
	const [draft, setDraft] = useState('')
	const post = usePostToThread(room, myAuthor)
	const draftImages = useDraftImages()
	// The box clears at once; a refused message comes back into it, unless
	// the admin has started the next one.
	const send = (body: string) => {
		const images = draftImages.take()
		setDraft('')
		post.mutate(
			{ body, images },
			{
				onError: (error) => {
					toastError(error.message)
					setDraft((current) => current || body)
					draftImages.restore(images)
				},
			}
		)
	}
	const principal = principalOf(room)
	const associates = associatesOf(room)

	return (
		<div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-2 pb-3">
			{room === 'command' && !draft && <StartMeeting weekly={weekly} />}
			<ComposeBar
				value={draft}
				onValueChange={setDraft}
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
				placeholder={`Message ${displayName(principal)}${associates.map((key) => `, or @${handleOf(key)}`).join('')}`}
				inputTestId="room-compose-input"
				sendTestId="room-compose-send"
			/>
		</div>
	)
}

function StartMeeting({ weekly }: { weekly: WeeklyType }) {
	const { data: command } = useQuery(commandQuery())
	const start = useStartMeeting()
	if (!meetingDue(weekly) || !command || command.meetingStartedAt) return null
	return (
		<Button
			size="sm"
			variant="soft"
			disabled={start.isPending}
			data-testid="room-start-meeting"
			onClick={() =>
				start.mutate(undefined, {
					onError: (error) => toastError(error.message),
				})
			}
		>
			Start the weekly meeting
		</Button>
	)
}
