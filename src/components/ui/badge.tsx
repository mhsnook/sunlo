import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { OctagonMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLangThemeCss, useLangPopularityReady } from '@/lib/lang-theme'

const badgeVariants = cva(
	'rounded inline-flex items-center border transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-xs inset-shadow-xs',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-lum-5 bg-chroma-max text-con-high',
				secondary: 'hue-neutral border-lum-3 bg-lum-2 text-lum-5',
				destructive:
					'border-transparent bg-lum-6 bg-chroma-high bg-hue-danger text-con-high',
				success: 'border-transparent bg-green-600 text-green-100',
				outline: 'text-lum-7 border-lum-3 bg-lum-1',
				lang: 'bg-lum-3 border-lum-4 text-con-mhigh chroma-mid font-mono font-bold uppercase tracking-wider items-end w-fit transition-colors duration-700',
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
	// getLangThemeCss, not a bare --hue-primary: the axis vars (--bg-h, --tx-h,
	// --bd-h) resolve var(--hue-primary) once at :root and inherit that fixed
	// value, and body re-declares --bg-h as hue-neutral. Only re-declaring the
	// axis vars here puts the language hue in scope for this subtree.
	const style = ready ? getLangThemeCss(lang) : undefined
	return (
		<Badge
			variant="lang"
			className={cn(
				!ready &&
					'!bg-lum-2 !bg-chroma-low !bg-hue-neutral !text-lum-7 !text-chroma-mid !text-hue-neutral !border-lum-3 !border-chroma-low !border-hue-neutral',
				className
			)}
			style={style}
		>
			{lang}
		</Badge>
	)
}

export { badgeVariants, Badge, OctogonMinusDangerBadge, TinyBadge, LangBadge }
