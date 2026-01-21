import { type ReactNode, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast, toastError } from '@/components/ui/sonner'
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
import { Button } from '@/components/ui/button'
import { useUserId } from '@/lib/use-auth'
import { SelectMultipleFriends } from '@/components/select-multiple-friends'
import { useAllChats } from '@/hooks/use-friends'

export function SendRequestToFriendDialog({
	lang,
	id,
	children,
}: {
	lang: string
	id: uuid
	children: ReactNode
}) {
	const userId = useUserId()
	const [open, setOpen] = useState(false)
	const [uids, setUids] = useState<uuid[]>([])
	const { isReady } = useAllChats()
	const sendRequestToFriendMutation = useMutation({
		mutationKey: ['send-request-to-friend', lang, id],
		mutationFn: async (friendUids: uuid[]) => {
			if (!userId) throw new Error('User not logged in')
			const messageInserts = friendUids.map((friendUid) => ({
				sender_uid: userId,
				recipient_uid: friendUid,
				request_id: id,
				lang,
				message_type: 'request' as const,
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
			toast.success('Request sent to friend')
		},
		onError: () => toastError('Something went wrong'),
	})

	if (!lang || !id) return null

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<AuthenticatedDialogContent
				authTitle="Login to Share"
				authMessage="You need to be logged in to share requests with friends."
			>
				<DialogTitle className="h3 font-bold">Share</DialogTitle>
				<DialogDescription className="sr-only">
					Select 1 or more friends from the list below to send this request to
					your in-app chat
				</DialogDescription>
				<SelectMultipleFriends uids={uids} setUids={setUids} />

				<Button
					disabled={!uids.length || !isReady}
					onClick={() => sendRequestToFriendMutation.mutate(uids)}
				>
					<Send /> Send to {uids.length} friend{uids.length === 1 ? '' : 's'}
				</Button>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}
