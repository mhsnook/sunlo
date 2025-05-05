import { cn } from '@/lib/utils'
import { PhraseFull } from '@/types/main'
import { buttonVariants } from '@/components/ui/button-variants'
import { Link } from '@tanstack/react-router'

type PhraseCardProps = {
	phrase: PhraseFull
}

export const PhraseCard = ({ phrase }: PhraseCardProps) => {
	if (!phrase.translations || !(phrase?.translations.length > 0)) return null
	return (
		<Link
			className={cn(
				buttonVariants({ variant: 'link' }),
				`s-link m-1 rounded border p-3`
			)}
			to="/learn/$lang/$id"
			params={{ lang: phrase.lang!, id: phrase.id! }}
		>
			<span className="font-semibold">{phrase.text}</span>{' '}
			<span className="text-muted-foreground text-sm">
				{phrase.translations[0].text}
			</span>
		</Link>
	)
}
