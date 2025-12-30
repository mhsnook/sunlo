import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader } from '@/components/ui/loader'
import { useLangPlaylists } from '@/hooks/use-playlists'
import type { CSSProperties } from 'react'
import languages from '@/lib/languages'
import { buttonVariants } from '@/components/ui/button-variants'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/_user/learn/$lang/playlists/')({
	component: RouteComponent,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function RouteComponent() {
	const { lang } = Route.useParams()

	const { data: playlists, isLoading } = useLangPlaylists(lang)
	return (
		<main style={style}>
			<div className="flex flex-row items-center justify-between">
				<h2 className="h2">Playlists of {languages[lang]} flashcards</h2>
				<Link
					to="/learn/$lang/playlists/new"
					from={Route.fullPath}
					className={buttonVariants()}
				>
					<Plus /> Create playlist
				</Link>
			</div>
			{isLoading ?
				<Loader />
			:	<div className="divide-y border">
					{playlists?.map((p) => (
						<div
							style={
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								{ viewTransitionName: `playlist-${p.id}` } as CSSProperties
							}
							className="p-4"
							key={p.id}
						>
							{p.title}
						</div>
					))}
				</div>
			}
		</main>
	)
}
