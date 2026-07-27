import * as React from 'react'
import { OctagonMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLangThemeCss, useLangPopularityReady } from '@/lib/lang-theme'

// Styles live in badge.css, next to this file.
const sizes = {
	lg: 'badge-size-lg',
	md: 'badge-size-md',
	sm: 'badge-size-sm',
} as const

// How loud, never what colour.
const variants = {
	default: 'badge-variant-default',
	secondary: 'badge-variant-secondary',
	outline: 'badge-variant-outline',
	lang: 'badge-variant-lang',
} as const

const hues = {
	primary: 'hue-primary',
	accent: 'hue-accent',
	neutral: 'hue-neutral',
	success: 'hue-success',
	warning: 'hue-warning',
	danger: 'hue-danger',
	info: 'hue-info',
} as const

export type BadgeVariant = keyof typeof variants
export type BadgeSize = keyof typeof sizes
export type BadgeHue = keyof typeof hues

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: BadgeVariant | null
	size?: BadgeSize | null
	hue?: BadgeHue | null
}

function Badge({ className, variant, size, hue, ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				`badge ${sizes[size ?? 'md']} ${variants[variant ?? 'default']} ${hue ? hues[hue] : ''}`,
				className
			)}
			{...props}
		/>
	)
}

const OctogonMinusDangerBadge = () => (
	<Badge hue="danger" className="p-2">
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
			hue={ready ? undefined : 'neutral'}
			className={cn(
				!ready &&
					'bg-lum-2! bg-chroma-low! text-con-mid! text-chroma-mid! border-lum-3! border-chroma-low!',
				className
			)}
			style={style}
		>
			{lang}
		</Badge>
	)
}

export { Badge, OctogonMinusDangerBadge, TinyBadge, LangBadge }
