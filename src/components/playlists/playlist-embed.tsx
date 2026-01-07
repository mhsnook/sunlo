import { useMemo } from 'react'

interface PlaylistEmbedProps {
	href: string
}

type EmbedType = 'youtube' | 'spotify' | 'soundcloud' | 'unknown'

interface EmbedInfo {
	type: EmbedType
	embedUrl: string | null
}

const height152 = { height: '152px' } as const
const height172 = { height: '172px' } as const

function detectEmbedType(url: string): EmbedInfo {
	try {
		const urlObj = new URL(url)
		const hostname = urlObj.hostname.toLowerCase()

		// YouTube
		if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
			let videoId: string | null = null

			if (hostname.includes('youtube.com')) {
				// Handle various YouTube URL formats
				if (urlObj.pathname.includes('/watch')) {
					videoId = urlObj.searchParams.get('v')
				} else if (urlObj.pathname.includes('/embed/')) {
					videoId = urlObj.pathname.split('/embed/')[1]?.split('?')[0]
				} else if (urlObj.pathname.includes('/playlist')) {
					// Playlist URL
					const listId = urlObj.searchParams.get('list')
					if (listId) {
						return {
							type: 'youtube',
							embedUrl: `https://www.youtube.com/embed/videoseries?list=${listId}`,
						}
					}
				}
			} else if (hostname.includes('youtu.be')) {
				// Short URL format
				videoId = urlObj.pathname.slice(1).split('?')[0]
			}

			if (videoId) {
				return {
					type: 'youtube',
					embedUrl: `https://www.youtube.com/embed/${videoId}`,
				}
			}
		}

		// Spotify
		if (hostname.includes('spotify.com')) {
			// Extract playlist/album/track ID from URL
			const pathParts = urlObj.pathname.split('/')
			const typeIndex = pathParts.findIndex(
				(part) =>
					part === 'playlist' ||
					part === 'album' ||
					part === 'track' ||
					part === 'episode'
			)

			if (typeIndex !== -1 && pathParts[typeIndex + 1]) {
				const embedType = pathParts[typeIndex]
				const id = pathParts[typeIndex + 1].split('?')[0]
				return {
					type: 'spotify',
					embedUrl: `https://open.spotify.com/embed/${embedType}/${id}`,
				}
			}
		}

		// SoundCloud
		if (hostname.includes('soundcloud.com')) {
			return {
				type: 'soundcloud',
				embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`,
			}
		}

		return { type: 'unknown', embedUrl: null }
	} catch (error) {
		console.error('Error parsing embed URL:', error)
		return { type: 'unknown', embedUrl: null }
	}
}

export function PlaylistEmbed({ href }: PlaylistEmbedProps) {
	const embedInfo = useMemo(() => detectEmbedType(href), [href])

	if (embedInfo.type === 'unknown' || !embedInfo.embedUrl) {
		return null
	}

	return (
		<div className="w-full overflow-hidden rounded-lg">
			{embedInfo.type === 'youtube' && (
				<iframe
					className="aspect-video h-full w-full"
					sandbox="allow-scripts"
					src={embedInfo.embedUrl}
					title="YouTube video player"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
				/>
			)}
			{embedInfo.type === 'spotify' && (
				<iframe
					className="w-full"
					sandbox="allow-scripts"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					style={height152}
					src={embedInfo.embedUrl}
					title="Spotify player"
					allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
					loading="lazy"
				/>
			)}
			{embedInfo.type === 'soundcloud' && (
				<iframe
					className="w-full"
					sandbox="allow-scripts"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					style={height172}
					src={embedInfo.embedUrl}
					title="SoundCloud player"
					allow="autoplay"
					loading="lazy"
				/>
			)}
		</div>
	)
}
