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

// The officer who runs the room answers unless the message names someone
// who works there with them. In the Command room, while the weekly meeting
// is due and not yet started, one tap starts it.
export function RoomThreadCompose({
	room,
	weekly,
}: {
	room: RoomKey
	weekly: WeeklyType
}) {
	const [draft, setDraft] = useState('')
	const post = usePostToThread(room)
	const send = (body: string) =>
		post.mutate(body, {
			onSuccess: () => setDraft(''),
			onError: (error) => toastError(error.message),
		})
	const principal = principalOf(room)
	const associates = associatesOf(room)

	return (
		<div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-2 pb-3">
			{room === 'command' && !draft && <StartMeeting weekly={weekly} />}
			<ComposeBar
				value={draft}
				onValueChange={setDraft}
				onSend={send}
				busy={post.isPending}
				startSlot={<VoiceControls setDraft={setDraft} />}
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
