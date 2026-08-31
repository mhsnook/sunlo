import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * One row in a conversation: avatar, alignment, header, content, footer.
 * Modelled on shadcn's Message (ui.shadcn.com/docs/components/base/message).
 *
 *   MessageGroup
 *   └── Message
 *       ├── MessageAvatar
 *       └── MessageContent
 *           ├── MessageHeader
 *           ├── Bubble          (from ./bubble)
 *           └── MessageFooter
 *
 * `align` is set once on `Message` and read by every part below it, so a
 * caller flips a whole row with one prop instead of threading `isMine`
 * through five ternaries.
 */

type MessageAlign = 'start' | 'end'

const MessageAlignContext = React.createContext<MessageAlign>('start')

const useMessageAlign = () => React.useContext(MessageAlignContext)

type MessageProps = React.ComponentProps<'div'> & {
	align?: MessageAlign
}

const Message = ({
	className,
	align = 'start',
	children,
	...props
}: MessageProps) => (
	<MessageAlignContext value={align}>
		<div
			data-slot="message"
			data-align={align}
			className={cn(
				'flex w-full items-end gap-2',
				align === 'end' ? 'flex-row-reverse' : 'flex-row',
				className
			)}
			{...props}
		>
			{children}
		</div>
	</MessageAlignContext>
)

/**
 * The avatar slot. Anchors to the bottom of the row so it sits beside the last
 * line of the bubble rather than floating next to the header.
 */
const MessageAvatar = ({
	className,
	...props
}: React.ComponentProps<'div'>) => (
	<div
		data-slot="message-avatar"
		className={cn('mb-1 shrink-0 self-end', className)}
		{...props}
	/>
)

const MessageContent = ({
	className,
	...props
}: React.ComponentProps<'div'>) => {
	const align = useMessageAlign()
	return (
		<div
			data-slot="message-content"
			className={cn(
				'flex min-w-0 flex-1 flex-col gap-1',
				align === 'end' ? 'items-end' : 'items-start',
				className
			)}
			{...props}
		/>
	)
}

const MessageHeader = ({
	className,
	...props
}: React.ComponentProps<'div'>) => {
	const align = useMessageAlign()
	return (
		<div
			data-slot="message-header"
			className={cn(
				'text-muted-foreground flex items-center gap-2 px-1 text-xs',
				align === 'end' ? 'flex-row-reverse text-end' : 'flex-row',
				className
			)}
			{...props}
		/>
	)
}

const MessageFooter = ({
	className,
	...props
}: React.ComponentProps<'div'>) => {
	const align = useMessageAlign()
	return (
		<div
			data-slot="message-footer"
			className={cn(
				'text-muted-foreground flex items-center gap-2 px-1 text-xs',
				align === 'end' ? 'flex-row-reverse text-end' : 'flex-row',
				className
			)}
			{...props}
		/>
	)
}

/**
 * Stacks consecutive messages from one sender. The tighter gap is the whole
 * point: it reads as one utterance in several parts, which a uniform gap
 * cannot express.
 */
const MessageGroup = ({ className, ...props }: React.ComponentProps<'div'>) => (
	<div
		data-slot="message-group"
		className={cn('flex w-full flex-col gap-1', className)}
		{...props}
	/>
)

/**
 * A centred system note between messages: a date break, a streaming state, or
 * a line explaining what the rows below it are. Not a message, so it takes no
 * avatar and ignores alignment.
 */
const MessageMarker = ({
	className,
	children,
	...props
}: React.ComponentProps<'div'>) => (
	<div
		data-slot="message-marker"
		className={cn(
			'text-muted-foreground flex w-full items-center gap-3 py-1 text-xs',
			className
		)}
		{...props}
	>
		<span className="bg-border h-px flex-1" />
		<span className="text-center">{children}</span>
		<span className="bg-border h-px flex-1" />
	</div>
)

export {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
	MessageMarker,
	useMessageAlign,
}
export type { MessageAlign }
