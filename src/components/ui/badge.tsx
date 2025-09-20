import { cn } from '@/lib/utils'
import { BadgeProps, badgeVariants } from './badge-variants'
import { Globe, OctagonMinus, Sparkle } from 'lucide-react'

export function Badge({ className, variant, size, ...props }: BadgeProps) {
	return (
		<span
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	)
}

export const OctogonMinusDangerBadge = () => (
	<Badge variant="destructive" className="p-2">
		<OctagonMinus />
	</Badge>
)

export function TinyBadge({
	useBadge,
}: {
	useBadge: () => number | string | boolean | undefined | null
}) {
	const content = useBadge()
	return (
		content ?
			content === 'star' ?
				<Sparkle className="text-primary dark:text-primary-foresoft fill-background -mx-1 size-2.5! place-self-start drop-shadow" />
			:	<Badge size="sm">{content}</Badge>
		:	null
	)
}

export function LangBadge({ lang }: { lang: string | null }) {
	return lang === null ? null : (
			<Badge className="my-0" variant="lang">
				<Globe className="-ms-0.5" size="16" /> {lang}
			</Badge>
		)
}
