import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { OctagonMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLangHue, useLangPopularityReady } from '@/lib/lang-theme'

const badgeVariants = cva(
	'rounded inline-flex items-center border transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-xs inset-shadow-xs',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-2-lo-neutral bg-1-lo-neutral text-5-mid-neutral',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground',
				success: 'border-transparent bg-green-600 text-green-100',
				outline: 'text-primary-foresoft border-2-lo-primary bg-0-lo-primary',
				lang: 'bg-1-mlo-primary text-fore-mlo-primary border-1-mlo-primary font-mono font-bold uppercase tracking-wider items-end w-fit transition-colors duration-700',
			},
			size: {
				lg: 'px-3 py-1 gap-2 [&>svg]:h-4 [&>svg]:w-4 [&>button]:h-5 [&>button]:w-5',
				md: 'px-2.5 py-0.5 text-xs gap-1.5 h-6 [&>svg]:h-4 [&>svg]:w-4',
				sm: 'px-1 py-0 text-[0.5rem] gap-1 [&>svg]:h-3 [&>svg]:w-3',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
		},
	}
)

export interface BadgeProps
	extends
		React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
	return (
		<span
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	)
}

const OctogonMinusDangerBadge = () => (
	<Badge variant="destructive" className="p-2">
		<OctagonMinus />
	</Badge>
)

function TinyBadge({
	useBadge,
}: {
	useBadge: () => number | string | boolean | undefined | null
}) {
	const content = useBadge()
	return content ? <Badge size="sm">{content}</Badge> : null
}

function LangBadge({ lang, className }: { lang: string; className?: string }) {
	const ready = useLangPopularityReady()
	if (!lang) return null
	const style = ready
		? ({ '--hue-primary': getLangHue(lang) } as React.CSSProperties)
		: undefined
	return (
		<Badge
			variant="lang"
			className={cn(
				!ready && '!bg-1-lo-neutral !text-7-mid-neutral !border-2-lo-neutral',
				className
			)}
			style={style}
		>
			{lang}
		</Badge>
	)
}

export { badgeVariants, Badge, OctogonMinusDangerBadge, TinyBadge, LangBadge }
