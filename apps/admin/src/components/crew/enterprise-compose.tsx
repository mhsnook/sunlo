import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import { toastError } from '@/components/ui/sonner'
import { meetingDue, type WeeklyType } from '../../../shared/crew'
import { usePostToEnterprise } from '~/lib/crew'

// Riker answers unless the message names Data. While the weekly meeting is
// due, one tap starts it.
export function EnterpriseCompose({ weekly }: { weekly: WeeklyType }) {
	const [draft, setDraft] = useState('')
	const post = usePostToEnterprise()
	const send = (body: string) =>
		post.mutate(body, {
			onSuccess: () => setDraft(''),
			onError: (error) => toastError(error.message),
		})

	return (
		<div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-2 pb-3">
			{meetingDue(weekly) && !draft && (
				<Button
					size="sm"
					variant="soft"
					disabled={post.isPending}
					data-testid="enterprise-start-meeting"
					onClick={() => send("Let's have our weekly meeting.")}
				>
					Start the weekly meeting
				</Button>
			)}
			<ComposeBar
				value={draft}
				onValueChange={setDraft}
				onSend={send}
				busy={post.isPending}
				placeholder="Message Riker, or @Data"
				inputTestId="enterprise-compose-input"
				sendTestId="enterprise-compose-send"
			/>
		</div>
	)
}
