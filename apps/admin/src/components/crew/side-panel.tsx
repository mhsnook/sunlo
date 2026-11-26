import { type ReactNode, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'

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
// Which panel shows beside a timeline, or null for none. A phone and a wider
// screen each keep their own, as the app sidebar does: the panel covers the
// timeline on a phone (SidePanelSlot), so one left open on a wide screen must
// not cover it once the window narrows. `wide` opens on a screen with room
// for it beside the timeline.
export function useSidePanel<T>(wide: T | null) {
	const isMobile = useIsMobile()
	const [onWide, setOnWide] = useState<T | null>(() =>
		window.matchMedia('(min-width: 64rem)').matches ? wide : null
	)
	const [onPhone, setOnPhone] = useState<T | null>(null)
	return isMobile
		? ([onPhone, setOnPhone] as const)
		: ([onWide, setOnWide] as const)
}

export function SidePanelSlot({ children }: { children: ReactNode }) {
	return (
		<div className="max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40 md:shrink-0">
			{children}
		</div>
	)
}
