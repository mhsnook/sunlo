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

export function LangBadge({
	lang,
	className,
}: {
	lang: string
	className?: string
}) {
	return lang === null ? null : (
			<Badge variant="lang" className={className}>
				<Globe className="-ms-0.5" size="10" />
				<span className="mt-0.5">{lang}</span>
			</Badge>
		)
}
