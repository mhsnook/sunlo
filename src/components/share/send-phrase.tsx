import { type ReactNode, useState } from 'react'
import { Send } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSendToFriends } from '@/features/social'
import {
	PhrasePreviewChip,
	FriendPickerDialog,
} from '@/components/share/friend-picker'
import { VariantProps } from 'class-variance-authority'
import { PhraseFullFilteredType } from '@/features/phrases/schemas'

function SendPhraseDialog({
	phrase,
	open,
	onOpenChange,
	trigger,
}: {
	phrase: PhraseFullFilteredType
	open: boolean
	onOpenChange: (open: boolean) => void
	trigger?: ReactNode
}) {
	const mutation = useSendToFriends(
		phrase.lang,
		{ message_type: 'recommendation', phrase_id: phrase.id },
		{ onSuccess: () => onOpenChange(false) }
	)
	return (
		<FriendPickerDialog
			open={open}
			onOpenChange={onOpenChange}
			trigger={trigger}
			title="Send to friends"
			description="Select 1 or more friends to send this phrase to your in-app chat"
			authTitle="Login to Send"
			authMessage="You need to be logged in to send phrases to friends."
			preview={<PhrasePreviewChip phrase={phrase} />}
			onSend={(uids) => mutation.mutate(uids)}
			isPending={mutation.isPending}
		/>
	)
}

export function SendPhraseToFriendButton({
	phrase,
	link,
	className,
	text = 'Send in chat',
	...props
}: {
	phrase: PhraseFullFilteredType
	link?: boolean
	className?: string
	text?: string
} & VariantProps<typeof buttonVariants>) {
	const [open, setOpen] = useState(false)

	const trigger = link ? (
		<span
			className={`inline-flex w-full cursor-pointer items-center gap-2 ${className}`}
		>
			<Send />
			{text}
		</span>
	) : (
		<Button {...props}>
			<Send /> {text && <span className="hidden @md:inline">{text}</span>}
		</Button>
	)

	return (
		<SendPhraseDialog
			phrase={phrase}
			open={open}
			onOpenChange={setOpen}
			trigger={trigger}
		/>
	)
}

export function SendPhraseToFriendDialog({
	phrase,
	open,
	onOpenChange,
}: {
	phrase: PhraseFullFilteredType
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	return (
		<SendPhraseDialog phrase={phrase} open={open} onOpenChange={onOpenChange} />
	)
}
