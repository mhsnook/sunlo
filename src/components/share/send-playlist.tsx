import { type ReactNode, useState } from 'react'
import { uuid } from '@/types/main'
import { ListMusic } from 'lucide-react'
import { useSendToFriends } from '@/features/social'
import {
	FriendPickerDialog,
	SharePreviewChip,
} from '@/components/share/friend-picker'

export function SendPlaylistToFriendDialog({
	lang,
	id,
	title,
	children,
}: {
	lang: string
	id: uuid
	title?: string
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)
	const mutation = useSendToFriends(
		lang,
		{ message_type: 'playlist', playlist_id: id },
		{ onSuccess: () => setOpen(false) }
	)

	if (!lang || !id) return null

	return (
		<FriendPickerDialog
			open={open}
			onOpenChange={setOpen}
			trigger={children}
			title="Share playlist"
			description="Select 1 or more friends to send this playlist to your in-app chat"
			authTitle="Login to Share"
			authMessage="You need to be logged in to share playlists with friends."
			preview={
				<SharePreviewChip
					icon={<ListMusic className="size-4.5" />}
					title={title ?? 'Playlist'}
					subtitle="Send this playlist to a friend"
				/>
			}
			onSend={(uids) => mutation.mutate(uids)}
			isPending={mutation.isPending}
		/>
	)
}
