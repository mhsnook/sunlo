import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import { toastError } from '@/components/ui/sonner'
import { meetingDue, type WeeklyType } from '../../../shared/crew'
import { usePostToEnterprise, useStartMeeting } from '~/lib/crew'
import { VoiceControls } from './voice-controls'

// Riker answers unless the message names Data. While the weekly meeting is
// due and not yet started, one tap starts it.
export function EnterpriseCompose({
	weekly,
	meetingStartedAt,
}: {
	weekly: WeeklyType
	meetingStartedAt: string | null
}) {
	const [draft, setDraft] = useState('')
	const post = usePostToEnterprise()
	const start = useStartMeeting()
	const send = (body: string) =>
		post.mutate(body, {
			onSuccess: () => setDraft(''),
			onError: (error) => toastError(error.message),
		})

	return (
		<div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-2 pb-3">
			{meetingDue(weekly) && !meetingStartedAt && !draft && (
				<Button
					size="sm"
					variant="soft"
					disabled={start.isPending}
					data-testid="enterprise-start-meeting"
					onClick={() =>
						start.mutate(undefined, {
							onError: (error) => toastError(error.message),
						})
					}
				>
					Start the weekly meeting
				</Button>
			)}
			<ComposeBar
				value={draft}
				onValueChange={setDraft}
				onSend={send}
				busy={post.isPending}
				startSlot={
					<VoiceControls
						onText={(text) =>
							setDraft((current) =>
								current.trim() ? `${current.trimEnd()} ${text}` : text
							)
						}
					/>
				}
				placeholder="Message Riker, or @Data"
				inputTestId="enterprise-compose-input"
				sendTestId="enterprise-compose-send"
			/>
		</div>
	)
}
