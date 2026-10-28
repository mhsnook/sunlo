import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// A panel beside a timeline: a title bar with a close button, and a body
// that scrolls on its own.
export function SidePanel({
	title,
	label = title,
	testId,
	testKey,
	actions,
	onClose,
	wide = false,
	bodyClassName,
	children,
}: {
	title: string
	label?: string
	testId: string
	testKey?: string
	// Controls in the title bar, before the close button.
	actions?: ReactNode
	onClose: () => void
	// For a document, which needs more room than a list.
	wide?: boolean
	bodyClassName?: string
	children: ReactNode
}) {
	return (
		<aside
			aria-label={label}
			data-testid={testId}
			data-key={testKey}
			className={cn(
				'bg-background flex h-full w-full flex-col border-s',
				wide ? 'md:w-xl' : 'md:w-96'
			)}
		>
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<h2 className="me-auto font-semibold">{title}</h2>
				{actions}
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Close ${title}`}
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			<div className={cn('flex-1 overflow-y-auto px-4 py-4', bodyClassName)}>
				{children}
			</div>
		</aside>
	)
}

// Where a side panel goes: beside the timeline on a wide screen, over it on a
// phone.
export function SidePanelSlot({ children }: { children: ReactNode }) {
	return (
		<div className="max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40 md:shrink-0">
			{children}
		</div>
	)
}
