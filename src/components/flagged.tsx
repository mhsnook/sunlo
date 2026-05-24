import type { ReactNode } from 'react'
import { flags } from '@/lib/flags'
import { isDevEnvironment } from '@/lib/dev-mode'
import { cn } from '@/lib/utils'

export default function Flagged({
	name,
	children,
	className,
}: {
	name?: keyof typeof flags
	className?: string
	children: ReactNode
}) {
	if (name) {
		// the disabled flag is an override; hides the content even in dev mode
		if (flags[name].disabled === true) return null
		// the enabled flag is the primary control
		if (flags[name].enabled === true) return children
	} else if (isDevEnvironment()) return children
	// show content in a local dev session only, with a little yellow border;
	// never on a deployed domain, even if the build mode is wrong
	return isDevEnvironment() ? (
		<div className={cn('border border-dashed border-yellow-500', className)}>
			{children}
		</div>
	) : null
}
