import * as React from 'react'
import { ArrowDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * The scroll container for a conversation. Modelled on shadcn's
 * MessageScroller (ui.shadcn.com/docs/react/message-scroller).
 *
 * It follows new messages, but only while the reader is already at the bottom.
 * The reader owns the scroll position the moment they leave it, and the
 * "Newest" button is the way back.
 */

/** How close to the bottom still counts as "at the bottom", in pixels. */
const PIN_THRESHOLD = 64

type MessageScrollerProps = React.ComponentProps<'div'> & {
	/**
	 * Re-checks the scroll position when this value changes — pass the message
	 * list. Content that resizes without changing this is followed too.
	 */
	dependency?: unknown
	/** Label on the button that returns the reader to the newest message. */
	jumpLabel?: string
}

const MessageScroller = ({
	className,
	children,
	dependency,
	jumpLabel = 'Newest',
	...props
}: MessageScrollerProps) => {
	const viewportRef = React.useRef<HTMLDivElement>(null)
	const contentRef = React.useRef<HTMLDivElement>(null)
	// Read inside the ResizeObserver, which must not re-subscribe on every
	// pin change — hence a ref alongside the state that drives the button.
	const isPinnedRef = React.useRef(true)
	const [isPinned, setIsPinned] = React.useState(true)

	const scrollToBottom = React.useCallback(
		(behavior: ScrollBehavior = 'smooth') => {
			const viewport = viewportRef.current
			if (!viewport) return
			viewport.scrollTo({ top: viewport.scrollHeight, behavior })
		},
		[]
	)

	React.useEffect(() => {
		const viewport = viewportRef.current
		if (!viewport) return

		const handleScroll = () => {
			const distanceFromBottom =
				viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
			const pinned = distanceFromBottom <= PIN_THRESHOLD
			isPinnedRef.current = pinned
			setIsPinned(pinned)
		}

		viewport.addEventListener('scroll', handleScroll, { passive: true })
		return () => viewport.removeEventListener('scroll', handleScroll)
	}, [])

	React.useEffect(() => {
		const content = contentRef.current
		if (!content) return

		// Content grows for two reasons: a message arrives, or an existing one
		// resizes as an image or a card finishes loading. Follow both.
		const observer = new ResizeObserver(() => {
			if (isPinnedRef.current) scrollToBottom('auto')
		})
		observer.observe(content)
		return () => observer.disconnect()
	}, [scrollToBottom])

	React.useEffect(() => {
		if (isPinnedRef.current) scrollToBottom('auto')
	}, [dependency, scrollToBottom])

	return (
		<div
			data-slot="message-scroller"
			className={cn('relative min-h-0 flex-1', className)}
			{...props}
		>
			<div
				ref={viewportRef}
				data-slot="message-scroller-viewport"
				data-pinned={isPinned ? '' : undefined}
				className="h-full overflow-y-auto overscroll-contain"
			>
				<div ref={contentRef} data-slot="message-scroller-content">
					{children}
				</div>
			</div>
			{!isPinned && (
				<Button
					type="button"
					variant="soft"
					size="sm"
					data-testid="message-scroller-jump"
					onClick={() => scrollToBottom()}
					className="absolute inset-x-0 bottom-2 mx-auto w-fit shadow-md"
				>
					<ArrowDown />
					{jumpLabel}
				</Button>
			)}
		</div>
	)
}

export { MessageScroller }
