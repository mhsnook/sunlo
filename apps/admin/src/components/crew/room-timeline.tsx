import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Bubble } from '@/components/ui/bubble'
import { toastError } from '@/components/ui/sonner'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
	MessageMarker,
} from '@/components/ui/message'
import { hasBlocks } from '../../../shared/blocks'
import {
	COMMON_ROOM,
	displayName,
	isCrewKey,
	roomNames,
	roomOf,
	speakerOf,
	type CrewMessageType,
} from '../../../shared/crew'
import {
	AgentAvatar,
	RoomCard,
	CardActions,
	ChangeCard,
	CrewText,
} from './crew-parts'
import { dayLabel, timeLabel, timeOrDay } from '~/lib/format'
import { OtherView } from './other-view'
import { MessageRuns } from './run-steps'
import { SideThread } from './side-thread'
import { RoutingMenu, routingNote } from './routing-menu'
import { SpeakableBubble } from './voice-controls'
import { MessageImages } from './images'
import { useReadOnArrival } from '~/lib/voice'
import { isNewFor, isPendingMessage, useCorrectRouting } from '~/lib/crew'

type Group = { author: string; messages: Array<CrewMessageType> }

// Consecutive messages from one author within ten minutes read as one turn.
function groupMessages(messages: Array<CrewMessageType>) {
	const groups: Array<Group> = []
	for (const message of messages) {
		const last = groups.at(-1)
		const previous = last?.messages.at(-1)
		if (
			last &&
			previous &&
			last.author === message.author &&
			dayLabel(previous.at) === dayLabel(message.at) &&
			Date.parse(message.at) - Date.parse(previous.at) < 10 * 60_000
		) {
			last.messages.push(message)
		} else {
			groups.push({ author: message.author, messages: [message] })
		}
	}
	return groups
}

export function RoomTimeline({
	messages,
	replies = {},
	myAuthor,
	newSince,
}: {
	messages: Array<CrewMessageType>
	// Side-thread replies, by the id of each thread's first message. They
	// fold under that message and are not in `messages`.
	replies?: Record<string, Array<CrewMessageType>>
	// "admin:<uid>" for the admin reading the room.
	myAuthor: string
	// Draw "New since …" before the first message from someone else after this.
	newSince: string | null
}) {
	useReadOnArrival(
		messages.flatMap((message) => {
			const agent = speakerOf(message)
			return agent ? [{ id: message.id, text: message.body, agent }] : []
		})
	)
	// A second view shows folded under the message it answers, when that is
	// on screen; otherwise it reads as an ordinary message.
	const ids = new Set(messages.map((message) => message.id))
	const others = new Map(
		messages.flatMap((message) =>
			message.otherViewOf && ids.has(message.otherViewOf)
				? [[message.otherViewOf, message] as const]
				: []
		)
	)
	const threads = new Map(Object.entries(replies))
	const shown = messages.filter(
		(message) => !message.otherViewOf || !others.has(message.otherViewOf)
	)
	const firstNew = shown.find((m) => isNewFor(m, newSince, myAuthor))?.id
	const groups = groupMessages(shown)
	const newSinceMarker = newSince ? (
		<MessageMarker
			className="text-primary-700 [&>span:not(:nth-child(2))]:bg-primary-300 font-semibold"
			data-testid="crew-new-since"
		>
			New since {timeOrDay(newSince)}
		</MessageMarker>
	) : null

	return (
		<div className="@container mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
			{groups.map((group, index) => {
				const day = dayLabel(group.messages[0].at)
				const previous = groups[index - 1]?.messages.at(-1)
				const showDay = !previous || dayLabel(previous.at) !== day
				const split = group.messages.findIndex((m) => m.id === firstNew)
				return (
					<Fragment key={group.messages[0].id}>
						{showDay && <MessageMarker>{day}</MessageMarker>}
						{split > 0 ? (
							<>
								<AuthorGroup
									messages={group.messages.slice(0, split)}
									myAuthor={myAuthor}
									others={others}
									threads={threads}
								/>
								{newSinceMarker}
								<AuthorGroup
									messages={group.messages.slice(split)}
									myAuthor={myAuthor}
									others={others}
									threads={threads}
								/>
							</>
						) : (
							<>
								{split === 0 && newSinceMarker}
								<AuthorGroup
									messages={group.messages}
									myAuthor={myAuthor}
									others={others}
									threads={threads}
								/>
							</>
						)}
					</Fragment>
				)
			})}
		</div>
	)
}

function AuthorGroup({
	messages,
	myAuthor,
	others,
	threads,
}: {
	messages: Array<CrewMessageType>
	myAuthor: string
	// Second views, by the id of the message each answers.
	others: Map<string, CrewMessageType>
	// Side-thread replies, by the id of the thread's first message.
	threads: Map<string, Array<CrewMessageType>>
}) {
	const first = messages[0]
	const mine = first.author === myAuthor
	const agent = isCrewKey(first.author) ? first.author : null

	return (
		<MessageGroup data-testid="crew-message-group" data-key={first.id}>
			{messages.map((message, index) => {
				const last = index === messages.length - 1
				const asksYou = !!message.card && message.card.kind === 'question'
				const blocks = hasBlocks(message.body)
				const other = others.get(message.id)
				return (
					<Message
						key={message.id}
						align={mine ? 'end' : 'start'}
						data-testid="crew-message"
						data-key={message.id}
						data-pending={isPendingMessage(message) || undefined}
						className="data-pending:opacity-60"
					>
						{!mine && (
							<MessageAvatar className={cn(!last && 'invisible')}>
								{agent ? (
									<Link
										to="/room/$room"
										params={{ room: roomOf(agent) }}
										aria-label={`${displayName(agent)}, in the ${roomNames[roomOf(agent)]}`}
									>
										<AgentAvatar agent={agent} size="sm" />
									</Link>
								) : (
									<AgentAvatar agent="crew" size="sm" />
								)}
							</MessageAvatar>
						)}
						<MessageContent>
							{index === 0 && (
								<MessageHeader>
									<span className="text-foreground font-semibold">
										{mine ? 'You' : message.authorName}
									</span>
									<span>{timeLabel(message.at)}</span>
								</MessageHeader>
							)}
							{message.images.length > 0 && (
								<MessageImages
									images={message.images}
									align={mine ? 'end' : 'start'}
								/>
							)}
							{message.card?.kind === 'change' ? (
								<ChangeCard message={message} />
							) : message.card && message.card.kind !== 'question' ? (
								<RoomCard message={message} />
							) : !message.body ? null : (
								<SpeakableBubble
									id={message.id}
									text={message.body}
									agent={speakerOf(message)}
									blocks={blocks}
								>
									<Bubble
										variant={
											mine
												? 'primary'
												: asksYou && !message.answer
													? 'soft'
													: blocks
														? 'outline'
														: 'muted'
										}
										align={mine ? 'end' : 'start'}
										className={cn(
											'min-w-0 whitespace-normal',
											blocks ? 'w-full max-w-2xl' : 'max-w-full @md:max-w-[80%]'
										)}
									>
										<CrewText text={message.body} />
									</Bubble>
								</SpeakableBubble>
							)}
							{asksYou && <CardActions message={message} />}
							<MessageRuns message={message} />
							{other && <OtherView original={message} other={other} />}
							{message.thread && (
								<SideThread
									root={message}
									thread={message.thread}
									replies={threads.get(message.id) ?? []}
								/>
							)}
							{mine && message.routing && message.place === 'room' && (
								<MessageFooter>
									<RoutingCorrection message={message} />
								</MessageFooter>
							)}
							{mine &&
								message.routing?.kind === 'stack' &&
								message.place !== COMMON_ROOM && (
									<MessageFooter>{routingNote(message.routing)}</MessageFooter>
								)}
						</MessageContent>
					</Message>
				)
			})}
		</MessageGroup>
	)
}

// The routing note under the admin's own message. Choosing another place
// corrects CLEF, and wakes any agent the message should have woken.
function RoutingCorrection({ message }: { message: CrewMessageType }) {
	const correct = useCorrectRouting()
	const shown = message.corrected ?? message.routing
	if (!shown) return null
	const note = routingNote(shown)
	return (
		<RoutingMenu
			label="Where should this have gone?"
			everyone={shown.kind === 'everyone' ? shown.agents : undefined}
			includeStack={false}
			disabled={correct.isPending}
			testId="crew-routing-correct"
			className="hover:text-foreground inline-flex items-center gap-1"
			onChoose={(routing) =>
				correct.mutate(
					{ messageId: message.id, routing },
					{ onError: (error) => toastError(error.message) }
				)
			}
		>
			{message.corrected
				? `Corrected: ${note[0].toLowerCase()}${note.slice(1)}`
				: note}
			<ChevronDown className="size-3" />
		</RoutingMenu>
	)
}
