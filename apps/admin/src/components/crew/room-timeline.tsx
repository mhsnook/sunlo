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
	bridgeKeys,
	crew,
	isCrewKey,
	speakerOf,
	type CrewMessageType,
} from '../../../shared/crew'
import {
	AgentAvatar,
	BridgeCard,
	CardActions,
	ChangeCard,
	CrewText,
} from './crew-parts'
import { dayLabel, timeLabel, timeOrDay } from '~/lib/format'
import { RoutingMenu, routingNote } from './routing-menu'
import { SpeakableBubble } from './voice-controls'
import { useReadOnArrival } from '~/lib/voice'
import { useCorrectRouting } from '~/lib/crew'

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
	myAuthor,
	newSince,
}: {
	messages: Array<CrewMessageType>
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
	const firstNew = newSince
		? messages.find((m) => m.at > newSince && m.author !== myAuthor)?.id
		: undefined
	const groups = groupMessages(messages)
	const newSinceMarker = newSince ? (
		<MessageMarker
			className="text-primary-700 [&>span:not(:nth-child(2))]:bg-primary-300 font-semibold"
			data-testid="crew-new-since"
		>
			New since {timeOrDay(newSince)}
		</MessageMarker>
	) : null

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
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
								/>
								{newSinceMarker}
								<AuthorGroup
									messages={group.messages.slice(split)}
									myAuthor={myAuthor}
								/>
							</>
						) : (
							<>
								{split === 0 && newSinceMarker}
								<AuthorGroup messages={group.messages} myAuthor={myAuthor} />
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
}: {
	messages: Array<CrewMessageType>
	myAuthor: string
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
				return (
					<Message
						key={message.id}
						align={mine ? 'end' : 'start'}
						data-testid="crew-message"
						data-key={message.id}
					>
						{!mine && (
							<MessageAvatar className={cn(!last && 'invisible')}>
								{agent && bridgeKeys.includes(agent) ? (
									<Link to="/enterprise" aria-label="The Enterprise">
										<AgentAvatar agent={agent} size="sm" />
									</Link>
								) : agent ? (
									<Link
										to="/crew/$agent"
										params={{ agent }}
										aria-label={`${crew[agent].name}'s workspace`}
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
							{message.card?.kind === 'change' ? (
								<ChangeCard message={message} />
							) : message.card && message.card.kind !== 'question' ? (
								<BridgeCard message={message} />
							) : (
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
											blocks && 'w-full max-w-2xl'
										)}
									>
										<CrewText text={message.body} />
									</Bubble>
								</SpeakableBubble>
							)}
							{asksYou && <CardActions message={message} />}
							{mine && message.routing && message.place === 'room' && (
								<MessageFooter>
									<RoutingCorrection message={message} />
								</MessageFooter>
							)}
							{mine &&
								message.routing?.kind === 'stack' &&
								message.place === 'bridge' && (
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
	return (
		<RoutingMenu
			label="Where should this have gone?"
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
				? `Corrected: ${routingNote(shown).toLowerCase()}`
				: routingNote(shown)}
			<ChevronDown className="size-3" />
		</RoutingMenu>
	)
}
