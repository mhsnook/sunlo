import { useState, type CSSProperties, type ReactNode } from 'react'
import {
	Copy,
	Edit,
	ExternalLink,
	ListMusic,
	MoreHorizontal,
	Send,
	Share,
	Trash2,
} from 'lucide-react'
import { PhrasePlaylistType } from '@/lib/schemas-playlist'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Badge, LangBadge } from '@/components/ui/badge'
import { useOnePlaylistPhrases } from '@/hooks/use-playlists'
import { SendPlaylistToFriendDialog } from './send-playlist-to-friend'
import { UpvotePlaylist } from './upvote-playlist-button'
import { Separator } from '@/components/ui/separator'
import { Link } from '@tanstack/react-router'
import { PlaylistEmbed, isEmbeddableUrl } from './playlist-embed'
import { useProfile } from '@/hooks/use-profile'
import { UpdatePlaylistDialog } from './update-playlist-dialog'
import { ManagePlaylistPhrasesDialog } from './manage-playlist-phrases-dialog'
import { DeletePlaylistDialog } from './delete-playlist-dialog'
import { playlistCoverUrlify } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { copyLink } from '@/lib/utils'
import { toastError } from '@/components/ui/sonner'
import languages from '@/lib/languages'

export function PlaylistItem({
	playlist,
	children,
}: {
	playlist: PhrasePlaylistType
	children?: ReactNode
}) {
	const { data } = useOnePlaylistPhrases(playlist.id)
	const { data: profile } = useProfile()
	const isOwner = profile?.uid === playlist.uid

	const [sendDialogOpen, setSendDialogOpen] = useState(false)
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [manageDialogOpen, setManageDialogOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	const url = `${window.location.origin}/learn/${playlist.lang}/playlists/${playlist.id}`

	const handleShare = () => {
		if (!navigator.share) return
		navigator
			.share({
				title: `Sunlo: ${playlist.title}`,
				text: `Check out this playlist of ${languages[playlist.lang]} phrases: ${playlist.title}`,
				url,
			})
			.catch((error: DOMException) => {
				if (error.name !== 'AbortError') {
					toastError('Failed to share')
				}
			})
	}

	return (
		<>
			<div
				style={
					{ viewTransitionName: `playlist-${playlist.id}` } as CSSProperties
				}
				className="bg-card text-card-foreground @container flex flex-col gap-3 rounded-lg border p-6 shadow-sm"
			>
				<div className="flex flex-row items-center justify-between gap-2">
					<UidPermalink
						uid={playlist.uid}
						action="created a Playlist"
						timeLinkTo="/learn/$lang/playlists/$playlistId"
						timeLinkParams={{
							lang: playlist.lang,
							playlistId: playlist.id,
						}}
						timeValue={playlist.created_at}
					/>

					<div className="flex items-center gap-2">
						<Badge variant="outline">
							{data?.length ?? 0} phrase
							{data?.length === 1 ? '' : 's'}
						</Badge>
						<LangBadge lang={playlist.lang} />
					</div>
				</div>
				<div className="flex items-start justify-between gap-4">
					<h2 className="h2 my-0">{playlist.title}</h2>
				</div>
				{playlist.description && (
					<p className="text-muted-foreground text-sm">
						{playlist.description}
					</p>
				)}

				{/* Cover image (shown when URL is not embeddable) */}
				{playlist.cover_image_path && !isEmbeddableUrl(playlist.href) && (
					<img
						src={playlistCoverUrlify(playlist.cover_image_path)}
						alt={`Cover for ${playlist.title}`}
						className="h-48 w-full rounded-lg object-cover"
					/>
				)}

				{/* Embed player for source material */}
				{playlist.href && <PlaylistEmbed href={playlist.href} />}

				{/* Track list of linked phrases */}
				{data && data.length > 0 && (
					<div className="text-muted-foreground flex flex-col gap-1 text-sm">
						{data.map(({ phrase }, index) => (
							<Link
								key={phrase.id}
								to="/learn/$lang/phrases/$id"
								params={{ lang: phrase.lang, id: phrase.id }}
								className="hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1 transition-colors"
							>
								<span className="text-muted-foreground/50 w-6 text-right text-xs">
									{index + 1}
								</span>
								<span
									className="truncate font-medium"
									style={
										{
											viewTransitionName: `phrase-text-${phrase.id}`,
										} as CSSProperties
									}
								>
									&ldquo;
									{phrase.text.length > 60 ?
										`${phrase.text.slice(0, 60)}...`
									:	phrase.text}
									&rdquo;
								</span>
								{phrase.translations && phrase.translations.length > 0 && (
									<span className="text-muted-foreground/70 ml-auto text-xs whitespace-nowrap">
										{phrase.translations.length} translation
										{phrase.translations.length === 1 ? '' : 's'}
									</span>
								)}
							</Link>
						))}
					</div>
				)}

				<div className="text-muted-foreground flex items-center justify-between gap-4 text-sm">
					<UpvotePlaylist playlist={playlist} />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								title="More actions"
								data-testid="playlist-more-actions"
							>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{playlist.href && (
								<DropdownMenuItem asChild>
									<a
										href={playlist.href}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLink className="h-4 w-4" />
										Source link
									</a>
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={() => copyLink(url)}>
								<Copy className="h-4 w-4" />
								Copy link
							</DropdownMenuItem>
							{'share' in navigator && (
								<DropdownMenuItem onClick={handleShare}>
									<Share className="h-4 w-4" />
									Share
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={() => setSendDialogOpen(true)}>
								<Send className="h-4 w-4" />
								Send to friend
							</DropdownMenuItem>
							{isOwner && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
										<Edit className="h-4 w-4" />
										Edit playlist
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setManageDialogOpen(true)}>
										<ListMusic className="h-4 w-4" />
										Manage phrases
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setDeleteDialogOpen(true)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
										Delete playlist
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				{children && <Separator />}
				{children}
			</div>

			{/* Dialogs rendered outside dropdown to work properly */}
			<SendPlaylistToFriendDialog
				id={playlist.id}
				lang={playlist.lang}
				open={sendDialogOpen}
				onOpenChange={setSendDialogOpen}
			>
				<span className="hidden" />
			</SendPlaylistToFriendDialog>

			<UpdatePlaylistDialog
				playlist={playlist}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
			>
				<span className="hidden" />
			</UpdatePlaylistDialog>

			<ManagePlaylistPhrasesDialog
				playlist={playlist}
				open={manageDialogOpen}
				onOpenChange={setManageDialogOpen}
			/>

			<DeletePlaylistDialog
				playlist={playlist}
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			/>
		</>
	)
}
