import { cn } from '@/lib/utils'
import { PhraseStub } from '@/types/main'
import { buttonVariants } from '@/components/ui/button-variants'
import { Link } from '@tanstack/react-router'

type PhraseCardProps = {
	phrase: PhraseStub
}

export const PhraseCard = ({ phrase }: PhraseCardProps) => (
	<Link
		className={cn(
			buttonVariants({ variant: 'link' }),
			`s-link rounded border p-3`
		)}
		to="/learn/$lang/$id"
		params={{ lang: phrase.lang, id: phrase.id }}
	>
		<span className="font-semibold">{phrase.text}</span>{' '}
		<span className="text-muted-foreground text-sm">
			{phrase.translation[0].text}
		</span>
	</Link>
)
