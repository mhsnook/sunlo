import {
	FeedActivityType,
	FeedActivityPayloadPhraseSchema,
} from '@/features/feed/schemas'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { Link } from '@tanstack/react-router'
import { usePhrase } from '@/hooks/composite-phrase'
import { useRequest } from '@/features/requests/hooks'
import { useOnePlaylist } from '@/features/playlists/hooks'
import { PhraseSummaryLine } from './feed-phrase-group-item'

export function FeedPhraseItem({ item }: { item: FeedActivityType }) {
	const payload = FeedActivityPayloadPhraseSchema.parse(item.payload)
	const source = payload.source
	const { data: phrase } = usePhrase(item.id)
	// Resolve the (rare) source link target to its public_id from the synced
	// collections. Both getters guard on the type so only one ever queries.
	const { data: sourceRequest } = useRequest(
		source?.type === 'request' ? source.id : undefined
	)
	const { data: sourcePlaylist } = useOnePlaylist(
		source?.type === 'playlist' ? source.id : undefined
	)
	if (item.type !== 'phrase' || !phrase) return null

	return (
		<div className="text-muted-foreground flex flex-col gap-1 px-2 py-2 text-sm">
			<div className="flex flex-col gap-2">
				<UidPermalinkInline
					uid={item.uid}
					action="added"
					timeValue={item.created_at}
					timeLinkTo="/learn/$lang/phrases/$id"
					timeLinkParams={{ lang: item.lang, id: phrase.public_id }}
				/>
				<div className="bg-background flex flex-row items-center gap-2 rounded-lg p-3">
					<PhraseSummaryLine item={item} />
				</div>
			</div>

			{/* @@TODO -- IT's possible this is entirely dead code at the moment */}
			{source && (
				<div className="text-muted-foreground/70 ml-2 text-xs italic">
					{source.type === 'request' ? (
						<>
							for{' '}
							<Link
								to="/learn/$lang/requests/$id"
								params={{ lang: item.lang, id: sourceRequest?.public_id ?? '' }}
								className="hover:text-foreground underline"
							>
								request
							</Link>
						</>
					) : source.type === 'playlist' ? (
						<>
							in{' '}
							<Link
								to="/learn/$lang/playlists/$playlistId"
								params={{
									lang: item.lang,
									playlistId: sourcePlaylist?.public_id ?? '',
								}}
								className="hover:text-foreground underline"
							>
								{source.title}
							</Link>
						</>
					) : null}
				</div>
			)}
		</div>
	)
}
