import { createFileRoute } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import { Loader } from '@/components/ui/loader'
import { useOnePlaylist } from '@/features/playlists/hooks'
import languages from '@/lib/languages'
import Callout from '@/components/ui/callout'
import { useUserId } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { AuthenticatedDialog } from '@/components/ui/authenticated-dialog'

export const Route = createFileRoute(
	'/_user/learn/$lang/playlists/$playlistId'
)({
	component: PlaylistPage,
	beforeLoad: ({ params }) => ({
		titleBar: {
			title: `Playlist of ${languages[params.lang]} Flashcards`,
			subtitle: '',
		},
		appnav: [],
	}),
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function PlaylistPage() {
	const { playlistId, lang } = Route.useParams()
	const { data: playlist, isLoading } = useOnePlaylist(playlistId)
	const userId = useUserId()

	return (
		<main style={style} data-testid="playlist-detail-page">
			{isLoading ?
				<Loader />
			: !playlist ?
				<Show404 />
			:	<>
					<PlaylistItem playlist={playlist} />
					{!userId && (
						<AuthenticatedDialog
							trigger={
								<Button
									size="lg"
									className="mt-4 w-full"
									onClick={() => {
										localStorage.setItem(
											'sunlo:playlist-intent',
											JSON.stringify({ lang, playlistId })
										)
									}}
									data-testid="start-learning-playlist-cta"
								>
									Start learning these phrases
								</Button>
							}
							authTitle="Start Learning"
							authMessage={`Sign up to start learning ${languages[lang]} with spaced repetition flashcards.`}
						>
							<></>
						</AuthenticatedDialog>
					)}
				</>
			}
		</main>
	)
}

function Show404() {
	return (
		<Callout variant="ghost">
			<p className="text-lg">Playlist not found</p>
		</Callout>
	)
}
