import { ExternalLink } from 'lucide-react'

interface PlaylistEmbedProps {
	href: string
}

export type EmbedType =
	| 'youtube'
	| 'spotify'
	| 'soundcloud'
	| 'instagram'
	| 'tiktok'
	| 'unknown'

export interface EmbedInfo {
	type: EmbedType
	embedUrl: string | null
}

const height152 = { height: '152px' } as const
const height172 = { height: '172px' } as const

export function detectEmbedType(url: string): EmbedInfo {
	try {
		const urlObj = new URL(url)
		const hostname = urlObj.hostname.toLowerCase()

		// YouTube
		if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
			let videoId: string | null = null

			if (hostname.includes('youtube.com')) {
				// Handle various YouTube URL formats
				if (urlObj.pathname.includes('/shorts/')) {
					videoId = urlObj.pathname.split('/shorts/')[1]?.split('?')[0]
				} else if (urlObj.pathname.includes('/watch')) {
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

		// Instagram (reels, posts, stories) — no iframe embed available
		if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
			return { type: 'instagram', embedUrl: null }
		}

		// TikTok — no iframe embed available
		if (hostname.includes('tiktok.com')) {
			return { type: 'tiktok', embedUrl: null }
		}

		return { type: 'unknown', embedUrl: null }
	} catch (error) {
		console.error('Error parsing embed URL:', error)
		return { type: 'unknown', embedUrl: null }
	}
}

/** Check if a URL can be embedded (YouTube, Spotify, SoundCloud) */
export function isEmbeddableUrl(url: string | null | undefined): boolean {
	if (!url) return false
	const embedInfo = detectEmbedType(url)
	return embedInfo.type !== 'unknown' && embedInfo.embedUrl !== null
}

const platformLabels: Record<string, string> = {
	instagram: 'Instagram',
	tiktok: 'TikTok',
}

export function PlaylistEmbed({ href }: PlaylistEmbedProps) {
	const embedInfo = detectEmbedType(href)

	if (embedInfo.type === 'unknown') {
		return null
	}

	// Recognized platforms without iframe embed support
	if (!embedInfo.embedUrl) {
		const label = platformLabels[embedInfo.type] ?? embedInfo.type
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="bg-1-mlo-neutral text-7-mid-neutral hover:bg-2-mlo-neutral flex items-center gap-2 rounded-2xl px-4 py-3 text-sm no-underline transition-colors"
			>
				<ExternalLink className="size-4 shrink-0" />
				<span>
					Watch on <strong>{label}</strong>
				</span>
			</a>
		)
	}

	return (
		<div className="w-full overflow-hidden rounded-lg">
			{embedInfo.type === 'youtube' && (
				<iframe
					className="aspect-video h-full w-full"
					sandbox="allow-scripts allow-same-origin allow-presentation"
					src={embedInfo.embedUrl}
					title="YouTube video player"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
				/>
			)}
			{embedInfo.type === 'spotify' && (
				<iframe
					className="w-full"
					sandbox="allow-scripts allow-same-origin allow-presentation"
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
					sandbox="allow-scripts allow-same-origin allow-presentation"
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
