import { toastError } from '@/components/ui/sonner'
import { Share } from 'lucide-react'

import type { uuid } from '@/types/main'
import languages from '@/lib/languages'
import { useOnePlaylist } from '@/features/playlists/hooks'
import { Button } from '@/components/ui/button'
import {
	canShareLink,
	isShareCancelled,
	shareLink,
	webOrigin,
} from '@/lib/native'

export function SharePlaylistButton({ id }: { id: uuid }) {
	const { data: playlist } = useOnePlaylist(id)

	const sharePlaylist = () => {
		if (!playlist) return
		void shareLink({
			title: `Sunlo: ${playlist.title}`,
			text: `Check out this playlist of ${languages[playlist.lang]} phrases: ${playlist.title}`,
			url: `${webOrigin}/learn/${playlist.lang}/playlists/${playlist.id}`,
		}).catch((error: unknown) => {
			if (!isShareCancelled(error)) toastError('Failed to share')
		})
	}

	if (!playlist || !canShareLink) return null

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={sharePlaylist}
			aria-label="Share playlist"
			data-testid="share-playlist-button"
		>
			<Share className="h-4 w-4" />
		</Button>
	)
}
