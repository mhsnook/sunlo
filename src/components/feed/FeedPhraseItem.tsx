import {
	FeedActivityType,
	FeedActivityPayloadPhraseSchema,
} from '@/lib/schemas'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Link } from '@tanstack/react-router'
import { MessageSquare, ListMusic } from 'lucide-react'

export function FeedPhraseItem({ item }: { item: FeedActivityType }) {
	if (item.type !== 'phrase') return null

	const payload = FeedActivityPayloadPhraseSchema.parse(item.payload)
	const source = payload.source

	return (
		<div>
			<p className="text-muted-foreground text-sm">A new Phrase</p>
			<div className="bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-4 shadow-sm">
				<div className="text-muted-foreground mb-2 flex flex-row items-center justify-between text-sm">
					<div className="flex items-center gap-2">
						<UidPermalink
							uid={item.uid}
							timeValue={item.created_at}
							// We don't link the time itself to anywhere specific for plain phrases yet,
							// or maybe to the phrase detail?
							timeLinkTo="/learn/$lang/phrases/$id"
							timeLinkParams={{ lang: item.lang, id: item.id }}
						/>
					</div>
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
		</div>
	)
}
