import { flags } from '@/lib/flags'
import { cn } from '@/lib/utils'
import { ReactNode } from '@tanstack/react-router'

export default function Flagged({
	name,
	children,
	className,
}: {
	name: keyof typeof flags
	className?: string
	children: ReactNode
}) {
	// the disabled flag is an override; hides the content even in dev mode
	if (flags[name].disabled === true) return null
	// the enabled flag is the primary control
	if (flags[name].enabled === true) return children

	// show content in dev/preview mode, with a little yellow border
	return import.meta.env.PROD ?
			null
		:	<div className={cn('border border-dashed border-yellow-500', className)}>
				{children}
			</div>
}
