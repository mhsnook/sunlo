import { EllipsisVertical } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Link, LinkProps } from '@tanstack/react-router'
import { VariantProps } from 'class-variance-authority'

export default function PermalinkButton({
	to,
	params,
	text = 'Permalink',
	variant = 'ghost',
	size = 'sm',
	className,
	link,
	...props
}: {
	text?: string
	className?: string
	link?: boolean
} & LinkProps &
	VariantProps<typeof buttonVariants>) {
	return !to ? null : (
			<Link
				to={to}
				params={params}
				className={cn(link ? '' : buttonVariants({ variant, size }), className)}
				preload="intent"
				{...props}
			>
				{text === '' ?
					<EllipsisVertical className="h-4 w-4" />
				: link ?
					<span className="inline-flex items-center gap-2">
						<EllipsisVertical className="h-4 w-4" />
						{text}
					</span>
				:	<span className="inline-flex items-center gap-2">
						<EllipsisVertical className="h-4 w-4" />
						<span className="hidden @sm:block">{text}</span>
					</span>
				}
			</Link>
		)
}
