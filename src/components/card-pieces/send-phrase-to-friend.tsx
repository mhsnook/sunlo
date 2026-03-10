import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { Send } from 'lucide-react'
import {
	Dialog,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { useUserId } from '@/lib/use-auth'
import { SelectMultipleFriends } from '@/components/select-multiple-friends'
import { VariantProps } from 'class-variance-authority'
import { PhraseFullFilteredType } from '@/features/phrases/schemas'
import { useAllChats } from '@/features/social/hooks'

function useSendPhraseToFriendMutation(
	phrase: PhraseFullFilteredType,
	setOpen: (open: boolean) => void
) {
	const userId = useUserId()
	const [uids, setUids] = useState<uuid[]>([])
	const { isReady } = useAllChats()
	const mutation = useMutation({
		mutationKey: ['send-phrase-to-friend', phrase.lang, phrase.id],
		mutationFn: async (friendUids: uuid[]) => {
			if (!userId) throw new Error('User not logged in')
			const messageInserts = friendUids.map((friendUid) => ({
				sender_uid: userId,
				recipient_uid: friendUid,
				phrase_id: phrase.id,
				lang: phrase.lang,
				message_type: 'recommendation' as const,
			}))
			const { data } = await supabase
				.from('chat_message')
				.insert(messageInserts)
				.throwOnError()
			return data
		},
		onSuccess: () => {
			setOpen(false)
			setUids([])
			toastSuccess('Phrase sent to friend')
		},
		onError: () => toastError('Something went wrong'),
	})
	return { mutation, uids, setUids, isReady }
}

function SendDialogContent({
	phrase,
	setOpen,
}: {
	phrase: PhraseFullFilteredType
	setOpen: (open: boolean) => void
}) {
	const { mutation, uids, setUids, isReady } = useSendPhraseToFriendMutation(
		phrase,
		setOpen
	)
	return (
		<AuthenticatedDialogContent
			authTitle="Login to Send"
			authMessage="You need to be logged in to send phrases to friends."
		>
			<DialogTitle className="h3 font-bold">Send to friends</DialogTitle>
			<DialogDescription className="sr-only">
				Select 1 or more friends from the list below to send this phrase to your
				in-app chat
			</DialogDescription>
			<SelectMultipleFriends uids={uids} setUids={setUids} />

			<Button
				disabled={!uids.length || !isReady}
				onClick={() => mutation.mutate(uids)}
			>
				<Send /> Send to {uids.length} friend{uids.length === 1 ? '' : 's'}
			</Button>
		</AuthenticatedDialogContent>
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

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild={!link} className={link ? 'w-full' : ''}>
				{link ?
					<span
						className={`inline-flex cursor-pointer items-center gap-2 ${className}`}
					>
						<Send />
						{text}
					</span>
				:	<Button {...props}>
						<Send /> {text && <span className="hidden @md:inline">{text}</span>}
					</Button>
				}
			</DialogTrigger>
			<SendDialogContent phrase={phrase} setOpen={setOpen} />
		</Dialog>
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<SendDialogContent phrase={phrase} setOpen={onOpenChange} />
		</Dialog>
	)
}
