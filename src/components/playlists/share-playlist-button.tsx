import toast from 'react-hot-toast'
import { Share } from 'lucide-react'

import type { uuid } from '@/types/main'
import type { ButtonProps } from '@/components/ui/button'
import languages from '@/lib/languages'
import { useOnePlaylist } from '@/hooks/use-playlists'
import { cn } from '@/lib/utils'

export function SharePlaylistButton({
	id,
	text = 'Share',
	className = '',
	...props
}: {
	id: uuid
	text?: string
	className?: string
} & ButtonProps) {
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
				toast.error('Failed to share')
			})
	}

	if (!playlist || !navigator.share) return null

	return (
		<button
			onClick={sharePlaylist}
			className={cn(
				'hover:text-foreground flex cursor-pointer items-center gap-1',
				className
			)}
			title="Share playlist"
			data-testid="share-playlist-button"
			{...props}
		>
			<Share className="h-4 w-4" />
			<span className="hidden @sm:block">{text}</span>
		</button>
	)
}
