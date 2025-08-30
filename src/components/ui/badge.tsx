import { cn } from '@/lib/utils'
import { BadgeProps, badgeVariants } from './badge-variants'
import { Globe, OctagonMinus } from 'lucide-react'

export function Badge({ className, variant, size, ...props }: BadgeProps) {
	return (
		<span
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	)
}

export const OctogonMinusDangerBadge = (
	<Badge variant="destructive" className="p-2">
		<OctagonMinus />
	</Badge>
)

export function TinyBadge({
	useBadge,
}: {
	useBadge: () => number | boolean | undefined | null
}) {
	const content = useBadge()
	return content ? <Badge size="sm">{content}</Badge> : null
}

export function LangBadge({ lang }: { lang: string }) {
	return (
		<Badge className="my-0" variant="lang" size="md">
			<Globe className="-ms-0.5" size="16" /> {lang}
		</Badge>
	)
}
