import {
	FeedActivityType,
	FeedActivityPayloadPhraseSchema,
} from '@/lib/schemas'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { Link } from '@tanstack/react-router'
import { MessageSquare, ListMusic } from 'lucide-react'

export function FeedPhraseItem({ item }: { item: FeedActivityType }) {
	if (item.type !== 'phrase') return null

	const payload = FeedActivityPayloadPhraseSchema.parse(item.payload)
	const source = payload.source

	return (
		<div className="flex flex-col gap-2 px-2 pt-4">
			<div className="text-muted-foreground mb-2 flex flex-row items-center justify-between text-sm">
				<UidPermalinkInline
					uid={item.uid}
					action="added a Phrase"
					timeValue={item.created_at}
					timeLinkTo="/learn/$lang/phrases/$id"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkParams={{ lang: item.lang, id: item.id }}
				/>
			</div>

			{source && (
				<div className="bg-muted/50 text-muted-foreground mb-2 rounded p-2 text-sm">
					{source.type === 'request' ?
						<div className="flex items-center gap-2">
							<MessageSquare className="h-4 w-4" />
							<span>
								In response to request{' '}
								<Link
									to="/learn/$lang/requests/$id"
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									params={{ lang: item.lang, id: source.id }}
									className="hover:text-foreground font-medium underline"
								>
									discussion
								</Link>
							</span>
						</div>
					: source.type === 'playlist' ?
						<div className="flex items-center gap-2">
							<ListMusic className="h-4 w-4" />
							<span>
								Added to playlist{' '}
								<Link
									to="/learn/$lang/playlists/$playlistId"
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									params={{ lang: item.lang, playlistId: source.id }}
									className="hover:text-foreground font-medium underline"
								>
									{source.title}
								</Link>
							</span>
						</div>
					:	null}
				</div>
			)}

			<PhraseTinyCard pid={item.id} />
		</div>
	)
}
