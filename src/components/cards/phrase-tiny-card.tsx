import type { OnePhraseComponentProps } from '@/types/main'
import { usePhrase } from '@/hooks/composite-phrase'
import { Link } from '@tanstack/react-router'
import { Loader } from '@/components/ui/loader'

export const PhraseTinyCard = ({ pid, lang }: OnePhraseComponentProps) => {
	const { data: phrase, status } = usePhrase(pid, lang)
	if (status === 'pending') return <Loader />
	if (status === 'not-found' || !phrase) {
		console.error(
			`Odd that PhraseTinyCard was requested, but then it wasn't found by the usePhrase hook`,
			lang,
			pid
		)
		return null
	}
	return (
		<Link
			className="s-link hover:bg-primary/10 m-1 block justify-start rounded-2xl p-3 no-underline decoration-2 shadow-sm transition-all hover:underline"
			to="/learn/$lang/$id"
			// oxlint-disable-next-line jsx-no-new-object-as-prop
			params={{ lang, id: pid }}
		>
			<p className="font-semibold">{phrase.text}</p>{' '}
			<p className="text-muted-foreground text-sm">
				{phrase.translations_mine?.[0].text.length ?
					phrase.translations_mine[0].text
				:	phrase.translations[0].text}
			</p>
		</Link>
	)
}
