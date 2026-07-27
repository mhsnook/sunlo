import { EllipsisVertical } from 'lucide-react'
import { Button, type ButtonVariantProps } from '@/components/ui/button'
import { Link, LinkProps } from '@tanstack/react-router'

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
	ButtonVariantProps) {
	if (!to) return null

	const anchor = (
		<Link
			to={to}
			params={params}
			className={className}
			preload="intent"
			{...props}
		>
			{text === '' ? (
				<EllipsisVertical className="h-4 w-4" />
			) : link ? (
				<span className="inline-flex items-center gap-2">
					<EllipsisVertical className="h-4 w-4" />
					{text}
				</span>
			) : (
				<span className="inline-flex items-center gap-2">
					<EllipsisVertical className="h-4 w-4" />
					<span className="hidden @sm:block">{text}</span>
				</span>
			)}
		</Link>
	)

	// asChild rather than a class string: variant and size arrive as props here,
	// and Slot merges the button's classes onto the Link.
	return link ? (
		anchor
	) : (
		<Button asChild variant={variant} size={size}>
			{anchor}
		</Button>
	)
}
