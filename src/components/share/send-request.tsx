import { type ReactNode, useState } from 'react'
import { uuid } from '@/types/main'
import { MessageCircleQuestion } from 'lucide-react'
import { useSendToFriends } from '@/features/social'
import {
	FriendPickerDialog,
	SharePreviewChip,
} from '@/components/share/friend-picker'

export function SendRequestToFriendDialog({
	lang,
	id,
	prompt,
	children,
}: {
	lang: string
	id: uuid
	prompt?: string
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)
	const mutation = useSendToFriends(
		lang,
		{ message_type: 'request', request_id: id },
		{ onSuccess: () => setOpen(false) }
	)

	if (!lang || !id) return null

	return (
		<FriendPickerDialog
			open={open}
			onOpenChange={setOpen}
			trigger={children}
			title="Share request"
			description="Select 1 or more friends to send this request to your in-app chat"
			authTitle="Login to Share"
			authMessage="You need to be logged in to share requests with friends."
			preview={
				<SharePreviewChip
					icon={<MessageCircleQuestion className="size-4.5" />}
					title={prompt ?? 'Phrase request'}
					subtitle="Send this request to a friend"
				/>
			}
			onSend={(uids) => mutation.mutate(uids)}
			isPending={mutation.isPending}
		/>
	)
}
