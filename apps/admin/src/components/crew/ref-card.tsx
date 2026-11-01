import type { ReactElement, ReactNode } from 'react'
import { PreviewCard } from '@base-ui/react/preview-card'

// A reference in an agent's text, with a card about it on hover or keyboard
// focus. A phone has no hover, so a tap follows the trigger's link instead.
export function RefCard({
	trigger,
	testId,
	testKey,
	children,
}: {
	trigger: ReactElement
	testId: string
	testKey: string
	children: ReactNode
}) {
	return (
		<PreviewCard.Root>
			<PreviewCard.Trigger render={trigger} />
			<PreviewCard.Portal>
				<PreviewCard.Positioner sideOffset={6} className="isolate z-50">
					<PreviewCard.Popup
						data-testid={testId}
						data-key={testKey}
						className="bg-popover text-popover-foreground w-72 rounded border p-3 text-sm shadow-md transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
					>
						{children}
					</PreviewCard.Popup>
				</PreviewCard.Positioner>
			</PreviewCard.Portal>
		</PreviewCard.Root>
	)
}
