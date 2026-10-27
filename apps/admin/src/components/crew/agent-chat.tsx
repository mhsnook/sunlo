import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFlueAgent } from '@flue/react'
import type { FlueConversationMessage } from '@flue/sdk'
import { ChevronLeft, Minus, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Bubble } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { ComposeBar } from '@/components/ui/compose-bar'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageMarker,
} from '@/components/ui/message'
import { MessageScroller } from '@/components/ui/message-scroller'
import { toastError } from '@/components/ui/sonner'
import { hasBlocks } from '../../../shared/blocks'
import { crew, type CrewKey } from '../../../shared/crew'
import { dmClient, workspaceQuery } from '~/lib/crew'
import { AgentAvatar, ChangeCard, CrewText } from './crew-parts'

// A 1:1 chat with one agent, as the Flue conversation "dm-<admin uid>". It
// floats over the workspace on a wide screen and fills the screen on a phone.
// `starter` is a one-tap first message, such as starting the weekly meeting.
export function AgentChat({
	agent,
	uid,
	starter,
}: {
	agent: CrewKey
	uid: string
	starter?: { label: string; message: string }
}) {
	const [open, setOpen] = useState(true)
	const [draft, setDraft] = useState('')
	const client = useMemo(() => dmClient(agent, uid), [agent, uid])
	const chat = useFlueAgent({ client })
	// A failed run leaves an assistant message with nothing to show.
	const visible = chat.messages.filter(
		(message) =>
			message.display === 'visible' &&
			message.role !== 'system' &&
			message.parts.some(
				(part) =>
					(part.type === 'text' && part.text.trim()) ||
					part.type === 'dynamic-tool'
			)
	)
	const busy = chat.status === 'submitted' || chat.status === 'streaming'
	const member = crew[agent]
	const send = (body: string, onError?: () => void) =>
		chat.sendMessage(body).catch((error: Error) => {
			onError?.()
			toastError(error.message)
		})

	if (!open) {
		return (
			<Button
				className="fixed end-4 bottom-4 z-30 shadow-lg"
				data-testid="agent-chat-open"
				onClick={() => setOpen(true)}
			>
				<MessageCircle /> Message {member.name}
			</Button>
		)
	}

	return (
		<section
			aria-label={`Chat with ${member.name}`}
			data-testid="agent-chat"
			className="bg-card fixed inset-0 z-30 flex flex-col md:inset-auto md:end-4 md:bottom-4 md:h-[min(40rem,80dvh)] md:w-96 md:rounded-2xl md:border md:shadow-xl"
		>
			<header className="flex items-center gap-3 border-b px-4 py-3">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Back to the workspace"
					className="md:hidden"
					onClick={() => setOpen(false)}
				>
					<ChevronLeft />
				</Button>
				<AgentAvatar agent={agent} size="sm" />
				<div className="me-auto">
					<p className="leading-tight font-semibold">{member.name}</p>
					<p className="text-muted-foreground text-xs">{member.title}</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Minimise the chat"
					className="max-md:hidden"
					onClick={() => setOpen(false)}
				>
					<Minus />
				</Button>
			</header>
			<MessageScroller dependency={visible}>
				<div className="flex flex-col gap-3 p-4">
					{chat.historyReady && !visible.length && (
						<MessageMarker>
							Ask {member.name} anything. Only you see this chat.
						</MessageMarker>
					)}
					{visible.map((message) => (
						<ChatMessage key={message.id} message={message} agent={agent} />
					))}
					{busy && <MessageMarker>{member.name} is thinking…</MessageMarker>}
					{chat.status === 'error' && chat.error && (
						<MessageMarker className="text-danger-700">
							{chat.error.message}
						</MessageMarker>
					)}
				</div>
			</MessageScroller>
			<div className="space-y-2 border-t p-3">
				{starter && !busy && (
					<Button
						size="sm"
						variant="soft"
						data-testid="agent-chat-starter"
						onClick={() => void send(starter.message)}
					>
						{starter.label}
					</Button>
				)}
				<ComposeBar
					value={draft}
					onValueChange={setDraft}
					onSend={(body) => {
						setDraft('')
						void send(body, () => setDraft(body))
					}}
					busy={busy}
					placeholder={`Message ${member.name}`}
					inputTestId="agent-chat-input"
					sendTestId="agent-chat-send"
				/>
			</div>
		</section>
	)
}

function ChatMessage({
	message,
	agent,
}: {
	message: FlueConversationMessage
	agent: CrewKey
}) {
	const mine = message.role === 'user'
	// A text part has no id of its own; its position in the message is stable.
	const parts = message.parts.map((part, position) => ({
		part,
		key: part.type === 'dynamic-tool' ? part.toolCallId : `text-${position}`,
	}))
	return (
		<Message
			align={mine ? 'end' : 'start'}
			data-testid="agent-chat-message"
			data-key={message.id}
		>
			{!mine && (
				<MessageAvatar>
					<AgentAvatar agent={agent} size="sm" />
				</MessageAvatar>
			)}
			<MessageContent>
				{parts.map(({ part, key }) => {
					if (part.type === 'text' && part.text.trim()) {
						return (
							<Bubble
								key={key}
								variant={
									mine ? 'primary' : hasBlocks(part.text) ? 'outline' : 'muted'
								}
								align={mine ? 'end' : 'start'}
								className={cn(
									'whitespace-normal',
									hasBlocks(part.text) && 'w-full max-w-full'
								)}
							>
								<CrewText text={part.text} />
							</Bubble>
						)
					}
					if (part.type === 'dynamic-tool') {
						return <ToolNote key={key} part={part} agent={agent} />
					}
					return null
				})}
			</MessageContent>
		</Message>
	)
}

type ToolPart = Extract<
	FlueConversationMessage['parts'][number],
	{ type: 'dynamic-tool' }
>

const toolLabels: Record<string, string> = {
	activity_between: 'Checked the activity numbers',
	run_sql: 'Ran a database query',
	post_to_crew: 'Posted in the crew room',
	read_room: 'Read the crew room',
	add_todo: 'Added a to-do',
	update_todo: 'Updated a to-do',
	remember: 'Saved a memory',
	forget: 'Forgot a memory',
	add_open_item: 'Added an open item',
	close_open_item: 'Closed an open item',
	bring_to_admin: 'Brought something to you',
	propose_charter: 'Proposed a charter entry',
	write_brief: 'Wrote the weekly brief',
	close_meeting: 'Closed the meeting',
	note_playbook: 'Noted it in the playbook',
}

function ToolNote({ part, agent }: { part: ToolPart; agent: CrewKey }) {
	if (part.toolName === 'propose_change' && part.state === 'output-available') {
		const { messageId } = part.output as { messageId: string }
		return <ProposedChange messageId={messageId} agent={agent} />
	}
	return (
		<p
			className={cn(
				'text-muted-foreground px-1 text-xs',
				part.state === 'output-error' && 'text-danger-700'
			)}
		>
			{toolLabels[part.toolName] ?? part.toolName}
			{part.state === 'input-available'
				? '…'
				: part.state === 'output-error'
					? ' (failed)'
					: ''}
		</p>
	)
}

// The card lives in the crew room's store; the workspace query carries its
// current answer.
function ProposedChange({
	messageId,
	agent,
}: {
	messageId: string
	agent: CrewKey
}) {
	const { data } = useQuery(workspaceQuery(agent))
	const card = data?.cards.find((c) => c.id === messageId)
	return card ? <ChangeCard message={card} /> : null
}
