import * as React from 'react'
import { Send } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * The text compose bar for a conversation: an auto-growing textarea, a send
 * button, and an optional slot for whatever else the surface attaches.
 *
 * Enter sends and Shift+Enter starts a new line, which is what people expect
 * from a chat box and what a plain `<Input>` cannot offer. The textarea grows
 * with the draft up to `maxRows`, then scrolls.
 */

type ComposeBarProps = Omit<
	React.ComponentProps<'form'>,
	'onSubmit' | 'onChange'
> & {
	value: string
	onValueChange: (value: string) => void
	/** Called with the trimmed draft. The caller clears `value` itself. */
	onSend: (value: string) => void
	placeholder?: string
	/** Blocks sending and dims the textarea — for a read-only conversation. */
	disabled?: boolean
	/** Blocks sending while a send is in flight, without dimming the draft. */
	busy?: boolean
	maxRows?: number
	/** Leading slot, before the textarea — attachment and share buttons. */
	startSlot?: React.ReactNode
	sendLabel?: string
	/** Accessible name for the textarea. Falls back to the placeholder. */
	inputLabel?: string
	inputTestId?: string
	sendTestId?: string
}

const ComposeBar = ({
	className,
	value,
	onValueChange,
	onSend,
	placeholder = 'Write a message…',
	disabled = false,
	busy = false,
	maxRows = 6,
	startSlot,
	sendLabel = 'Send',
	inputLabel,
	inputTestId = 'compose-bar-input',
	sendTestId = 'compose-bar-send',
	...props
}: ComposeBarProps) => {
	const textareaRef = React.useRef<HTMLTextAreaElement>(null)
	const canSend = !disabled && !busy && value.trim().length > 0

	// A textarea reports its content height only after its own height is
	// released, so measuring means resetting to `auto` first. There is no
	// CSS-only equivalent that also caps at a row count.
	React.useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return
		textarea.style.height = 'auto'
		const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20
		const maxHeight = lineHeight * maxRows
		textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
		textarea.style.overflowY =
			textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
	}, [value, maxRows])

	const send = () => {
		if (!canSend) return
		onSend(value.trim())
		textareaRef.current?.focus()
	}

	return (
		<form
			data-slot="compose-bar"
			onSubmit={(e) => {
				e.preventDefault()
				send()
			}}
			className={cn('flex w-full flex-row items-end gap-2', className)}
			{...props}
		>
			{startSlot}
			<textarea
				ref={textareaRef}
				rows={1}
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				aria-label={inputLabel ?? placeholder}
				autoComplete="off"
				data-slot="compose-bar-input"
				data-testid={inputTestId}
				onChange={(e) => onValueChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key !== 'Enter' || e.shiftKey) return
					e.preventDefault()
					send()
				}}
				className="border-primary-300 hover:border-primary bg-card/50 ring-offset-background placeholder:text-muted-foreground text-foreground focus-visible:ring-ring max-h-40 min-h-10 w-full resize-none rounded-2xl border px-3 py-2 text-base inset-shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
			/>
			<Button
				type="submit"
				size="icon"
				disabled={!canSend}
				aria-label={sendLabel}
				data-testid={sendTestId}
				className="mb-1"
			>
				<Send />
			</Button>
		</form>
	)
}

export { ComposeBar }
export type { ComposeBarProps }
