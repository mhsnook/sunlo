import { toastError } from '@/components/ui/sonner'
import { Share } from 'lucide-react'

import type { uuid } from '@/types/main'
import languages from '@/lib/languages'
import { useOnePlaylist } from '@/hooks/use-playlists'
import { Button } from '@/components/ui/button'

export function SharePlaylistButton({ id }: { id: uuid }) {
	const { data: playlist } = useOnePlaylist(id)

	const sharePlaylist = () => {
		if (!playlist) return
		navigator
			.share({
				title: `Sunlo: ${playlist?.title}`,
				text: `Check out this playlist of ${languages[playlist?.lang]} phrases: ${playlist?.title}`,
				url: `${window.location.origin}/learn/${playlist?.lang}/playlists/${playlist?.id}`,
			})
			.catch((error: DOMException) => {
				if (error.name !== 'AbortError') {
					toastError('Failed to share')
				}
			})
	}

	if (!playlist || !navigator.share) return null

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
