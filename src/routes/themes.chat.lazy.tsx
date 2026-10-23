import { useState } from 'react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Plus, Sparkles } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble } from '@/components/ui/bubble'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposeBar } from '@/components/ui/compose-bar'
import { MessageScroller } from '@/components/ui/message-scroller'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
	MessageMarker,
} from '@/components/ui/message'
import { cn } from '@/lib/utils'

export const Route = createLazyFileRoute('/themes/chat')({
	component: ChatThemePage,
})

const VARIANTS = [
	'primary',
	'soft',
	'accent',
	'muted',
	'outline',
	'ghost',
] as const

/**
 * Gallery for the conversation primitives. It runs without auth or seeded
 * data, which is the point: the two real chat surfaces both need a signed-in
 * user and a populated database, so this is where the variants get looked at.
 */
function ChatThemePage() {
	const [draft, setDraft] = useState('')
	const [sent, setSent] = useState<Array<{ id: string; body: string }>>([])

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
			<div className="flex flex-col gap-2">
				<Link
					to="/themes"
					className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
				>
					<ArrowLeft className="size-3" />
					Themes
				</Link>
				<h1 className="text-2xl font-semibold">Conversation</h1>
				<p className="text-muted-foreground text-sm">
					Message, Bubble, MessageScroller and ComposeBar — the parts both the
					friend chats and the phrasebook chat are built from.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Bubble variants</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{VARIANTS.map((variant) => (
						<div key={variant} className="flex flex-col gap-1">
							<p className="text-muted-foreground text-xs">{variant}</p>
							<div className="flex flex-col gap-1">
								<Bubble variant={variant} align="start">
									Where is the supermarket?
								</Bubble>
								<Bubble variant={variant} align="end">
									Two streets that way.
								</Bubble>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>A conversation</CardTitle>
				</CardHeader>
				<CardContent className="flex h-96 flex-col p-0">
					<MessageScroller dependency={sent} className="px-4">
						<div className="flex flex-col gap-4 py-4">
							<MessageMarker>Yesterday</MessageMarker>

							<Message align="start">
								<MessageAvatar>
									<Avatar className="size-8">
										<AvatarFallback seed="ana">A</AvatarFallback>
									</Avatar>
								</MessageAvatar>
								<MessageContent>
									<MessageHeader>
										<span>Ana</span>
										<span>&middot;</span>
										<span>2 days ago</span>
									</MessageHeader>
									<MessageGroup>
										<Bubble variant="muted">
											I keep forgetting the word for receipt.
										</Bubble>
										<Bubble variant="muted">Do you have a card for it?</Bubble>
									</MessageGroup>
								</MessageContent>
							</Message>

							<Message align="end">
								<MessageContent>
									<MessageHeader>
										<span>2 days ago</span>
									</MessageHeader>
									<Bubble variant="primary" align="end">
										It is “el recibo”. Adding it to your deck now.
									</Bubble>
									<MessageFooter>
										<span>Read</span>
									</MessageFooter>
								</MessageContent>
							</Message>

							<Message align="start">
								<MessageAvatar className="self-start">
									<span className="bg-accent-100 text-accent-800 flex size-8 items-center justify-center rounded-lg">
										<Sparkles className="size-4" />
									</span>
								</MessageAvatar>
								<MessageContent>
									{/* A ghost bubble for content that brings its own card. */}
									<Bubble variant="ghost">
										<Card className="p-3">
											<p className="font-medium">el recibo</p>
											<p className="text-muted-foreground text-sm">
												the receipt
											</p>
										</Card>
									</Bubble>
								</MessageContent>
							</Message>

							{sent.map((message) => (
								<Message key={message.id} align="end">
									<MessageContent>
										<Bubble variant="primary" align="end">
											{message.body}
										</Bubble>
									</MessageContent>
								</Message>
							))}
						</div>
					</MessageScroller>
					<div className="border-t p-4">
						<ComposeBar
							value={draft}
							onValueChange={setDraft}
							onSend={(body) => {
								setSent((current) => [
									...current,
									{ id: crypto.randomUUID(), body },
								])
								setDraft('')
							}}
							placeholder="Message Ana…"
							startSlot={
								<span
									className={cn(
										buttonVariants({ variant: 'soft', size: 'icon' }),
										'mb-1'
									)}
								>
									<Plus />
								</span>
							}
						/>
					</div>
				</CardContent>
			</Card>
		</main>
	)
}
