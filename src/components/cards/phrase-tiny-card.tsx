import type { uuid } from '@/types/main'
import { usePhrase } from '@/hooks/composite'
import { Link } from '@tanstack/react-router'
import { Loader } from '@/components/ui/loader'

type PhraseTinyCardProps = {
	pid: uuid
	lang: string
}

export const PhraseTinyCard = ({ pid, lang }: PhraseTinyCardProps) => {
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
			params={{ lang: lang, id: pid }}
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
