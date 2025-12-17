import { usePhrase } from '@/hooks/composite-phrase'
import { Link } from '@tanstack/react-router'
import { Loader } from '@/components/ui/loader'
import { uuid } from '@/types/main'
import { LangBadge } from '@/components/ui/badge'
import { CardStatusHeart } from '@/components/card-pieces/card-status-dropdown'
import { CardlikeFlashcard } from '@/components/ui/card-like'

export const PhraseTinyCard = ({
	pid,
	className,
}: {
	pid: uuid
	className: string
}) => {
	const { data: phrase, status } = usePhrase(pid)
	if (status === 'pending') return <Loader />
	if (status === 'not-found' || !phrase) {
		console.error(
			`Odd that PhraseTinyCard was requested, but then it wasn't found by the usePhrase hook`,
			pid
		)
		return null
	}
	return (
		<Link
			className={`m-1 transition-all hover:-translate-y-px ${className}`}
			to="/learn/$lang/$id"
			// oxlint-disable-next-line jsx-no-new-object-as-prop
			params={{ lang: phrase.lang, id: pid }}
		>
			<CardlikeFlashcard className="flex min-w-40 basis-50 flex-col justify-start px-3 py-2">
				<div className="line-clamp-3">
					<p className="font-semibold">{phrase.text}</p>{' '}
					<p className="text-muted-foreground text-sm">
						{phrase.translations_mine?.[0]?.text.length ?
							phrase.translations_mine[0].text
						:	phrase.translations[0].text}
					</p>
				</div>
				<div className="mt-auto flex w-full flex-row justify-between self-end pt-2">
					<LangBadge lang={phrase.lang} />
					<CardStatusHeart phrase={phrase} />
				</div>
			</CardlikeFlashcard>
		</Link>
	)
}
