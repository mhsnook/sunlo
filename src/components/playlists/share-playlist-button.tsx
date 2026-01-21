import { toastError } from '@/components/ui/error-toast'
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
			.catch(() => {
				toastError('Failed to share')
			})
	}

	if (!playlist || !navigator.share) return null

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={sharePlaylist}
			title="Share playlist"
			data-testid="share-playlist-button"
		>
			<Share className="h-4 w-4" />
			<span className="sr-only">Share</span>
		</Button>
	)
}
