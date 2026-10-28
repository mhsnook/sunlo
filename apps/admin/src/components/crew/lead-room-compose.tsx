import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import { toastError } from '@/components/ui/sonner'
import {
	displayName,
	meetingDue,
	roomMembers,
	type LeadKey,
	type WeeklyType,
} from '../../../shared/crew'
import { commandQuery, usePostToLeadRoom, useStartMeeting } from '~/lib/crew'
import { VoiceControls } from './voice-controls'

// The lead answers unless the message names the room's advisor. In the
// Command room, while the weekly meeting is due and not yet started, one tap
// starts it.
export function LeadRoomCompose({
	lead,
	weekly,
}: {
	lead: LeadKey
	weekly: WeeklyType
}) {
	const [draft, setDraft] = useState('')
	const post = usePostToLeadRoom(lead)
	const send = (body: string) =>
		post.mutate(body, {
			onSuccess: () => setDraft(''),
			onError: (error) => toastError(error.message),
		})
	const advisors = roomMembers(lead).filter((key) => key !== lead)

	return (
		<div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-2 pb-3">
			{lead === 'riker' && !draft && <StartMeeting weekly={weekly} />}
			<ComposeBar
				value={draft}
				onValueChange={setDraft}
				onSend={send}
				busy={post.isPending}
				startSlot={<VoiceControls setDraft={setDraft} />}
				placeholder={`Message ${displayName(lead)}${advisors.map((key) => `, or @${key}`).join('')}`}
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
