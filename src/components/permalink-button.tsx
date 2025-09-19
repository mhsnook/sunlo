import { LinkIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
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
	...props
}: { text?: string; className?: string } & LinkProps &
	VariantProps<typeof buttonVariants>) {
	return !to ? null : (
			<Link
				to={to}
				params={params}
				className={cn(buttonVariants({ variant, size }), className)}
				preload="intent"
				{...props}
			>
				<LinkIcon className="h-4 w-4" />
				{text !== '' && <span className="hidden @sm:block">{text}</span>}
			</Link>
		)
}
