import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { VariantProps } from 'class-variance-authority'
import { ButtonProps, buttonVariants } from './ui/button-variants'
import { useAuth } from '@/lib/hooks'

export function SendPhraseToFriendButton({
	pid,
	lang,
	variant,
	size,
}: {
	pid: uuid
	lang: string
	variant: ButtonProps['variant']
	size: ButtonProps['size']
}) {
	const { userId } = useAuth()
	const [uids, setUids] = useState<uuid[]>([])
	const sendPhraseToFriendMutation = useMutation({
		mutationKey: ['send-phrae-to-friend', lang, pid],
		mutationFn: async (friendUids: uuid[]) => {
			if (!userId) throw new Error('User not logged in')
			const messageInserts = friendUids.map((friendUid) => ({
				sender_uid: userId,
				recipient_uid: friendUid,
				phrase_id: pid,
				lang,
				message_type: 'recommendation' as const,
			}))
			const { data } = await supabase
				.from('chat_message')
				.insert(messageInserts)
				.throwOnError()
			return data
		},
		onSuccess: () => toast.success('Phrase sent to friend'),
		onError: () => toast.error('Something went wrong'),
	})

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={variant} size={size}>
					<Send /> Send in chat
				</Button>
			</DialogTrigger>
			<DialogContent></DialogContent>
		</Dialog>
	)
}
