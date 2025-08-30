import { LinkIcon } from 'lucide-react'
import { ButtonProps, buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { Link, LinkProps } from '@tanstack/react-router'

export default function PermalinkButton({
	to,
	params,
	text = 'Permalink',
	variant = 'ghost',
	size = 'badge',
	className = '',
	...props
}: { text?: string } & LinkProps & ButtonProps) {
	return !to ? null : (
			<Link
				to={to}
				params={params}
				className={cn(buttonVariants({ variant, size }), className)}
				preload="intent"
				{...props}
			>
				<LinkIcon className="h-4 w-4" />
				<span className="hidden @sm:block">{text}</span>
			</Link>
		)
}
