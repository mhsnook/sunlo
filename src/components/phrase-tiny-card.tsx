import { PhraseFull } from '@/types/main'
import { Link } from '@tanstack/react-router'

type PhraseTinyCardProps = {
	phrase: PhraseFull
}

export const PhraseTinyCard = ({ phrase }: PhraseTinyCardProps) => {
	if (!phrase.translations || !(phrase?.translations.length > 0)) return null
	return (
		<Link
			className="s-link hover:bg-primary/10 m-1 block justify-start rounded border p-3 no-underline decoration-2 transition-all hover:underline"
			to="/learn/$lang/$id"
			params={{ lang: phrase.lang!, id: phrase.id! }}
		>
			<p className="font-semibold">{phrase.text}</p>{' '}
			<p className="text-muted-foreground text-sm">
				{phrase.translations[0].text}
			</p>
		</Link>
	)
}
