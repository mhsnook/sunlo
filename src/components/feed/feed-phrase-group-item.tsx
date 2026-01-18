import { FeedActivityType } from '@/lib/schemas'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { Link } from '@tanstack/react-router'
import { usePhrase } from '@/hooks/composite-phrase'
import { useProfile } from '@/hooks/use-profile'
import { Bookmark, MessageSquareQuote, Users } from 'lucide-react'
import { CSSProperties } from 'react'
import { uuid } from '@/types/main'

export function PhraseSummaryLine({
	item,
}: {
	item: FeedActivityType | { lang: string; id: uuid }
}) {
	const { data: phrase } = usePhrase(item.id)
	const { data: profile } = useProfile()

	if (!phrase) return null

	// Count translations in languages the user knows
	const userLanguages = profile?.languages_known ?? []
	const knownLangTranslations = phrase.translations.filter((t) =>
		userLanguages.some((ul) => ul.lang === t.lang)
	)
	const translationCount = knownLangTranslations.length

	// Truncate phrase text if needed
	const maxLength = 50
	const phraseText =
		phrase.text.length > maxLength ?
			`${phrase.text.slice(0, maxLength)}...`
		:	phrase.text

	return (
		<div className="group flex flex-row items-center gap-2 px-2">
			<Link
				to="/learn/$lang/phrases/$id"
				params={{ lang: item.lang, id: item.id }}
				className="group-hover:text-foreground inline-flex min-w-0 flex-1 items-center gap-2 font-medium"
				data-testid={`feed-phrase-link-${item.id}`}
				// Only link if it's from the feed; otherwise assume it's not meant to be interactive
				disabled={!('payload' in item)}
			>
				<MessageSquareQuote size={14} className="shrink-0" />
				<span
					className="truncate"
					style={
						{ viewTransitionName: `phrase-text-${item.id}` } as CSSProperties
					}
				>
					&ldquo;{phraseText}&rdquo;
				</span>
				{translationCount > 0 && (
					<span className="text-muted-foreground/70 group-hover:text-foreground shrink-0 text-xs whitespace-nowrap">
						({translationCount} translation{translationCount === 1 ? '' : 's'})
					</span>
				)}
				{(
					phrase?.card?.status &&
					['active', 'learned'].includes(phrase.card.status)
				) ?
					<Bookmark className="text-muted-foreground/70 shrink-0" size={12} />
				:	null}
			</Link>

			{(phrase.count_learners ?? 0) > 0 && (
				<span
					className="text-muted-foreground/70 flex shrink-0 items-center gap-1 text-xs whitespace-nowrap"
					title={`${phrase.count_learners} ${phrase.count_learners === 1 ? 'person is' : 'people are'} learning this phrase`}
				>
					<Users size={12} />
					{phrase.count_learners}
				</span>
			)}
		</div>
	)
}

export function FeedPhraseGroupItem({ items }: { items: FeedActivityType[] }) {
	if (items.length === 0) return null

	const firstItem = items[0]

	return (
		<div className="text-muted-foreground flex flex-col gap-2 rounded-lg p-3 text-sm">
			<div className="flex flex-row items-center gap-2">
				<UidPermalinkInline
					uid={firstItem.uid}
					action={`added ${items.length} phrase${items.length === 1 ? '' : 's'}`}
					timeValue={firstItem.created_at}
					timeLinkTo="/learn/$lang/phrases/$id"
					timeLinkParams={{ lang: firstItem.lang, id: firstItem.id }}
				/>
			</div>
			<div className="bg-background flex flex-col gap-1 rounded p-2">
				{items.map((item) => (
					<PhraseSummaryLine key={item.id} item={item} />
				))}
			</div>
		</div>
	)
}
