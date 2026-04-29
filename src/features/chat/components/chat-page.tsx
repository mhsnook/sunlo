import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CartButton } from './cart-button'
import { ChatInput } from './chat-input'
import { ChatTurnView } from './chat-message'
import { SelectionBar } from './selection-bar'
import { useChatTurns } from '../hooks'
import { useChatRouteLang } from '../store'

type Props = {
	languageLabel?: string
}

export function ChatPage({ languageLabel }: Props) {
	const lang = useChatRouteLang()
	const turns = useChatTurns()
	const bottomRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [turns])

	return (
		<div
			data-testid="chat-page"
			data-lang={lang}
			className="@container mx-auto flex h-svh w-full max-w-2xl flex-col gap-4 p-4"
		>
			<header className="flex flex-row items-start justify-between gap-3">
				<div className="flex flex-1 flex-col gap-2">
					<Link
						to="/chats"
						data-testid="chat-back-link"
						className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
					>
						<ArrowLeft className="h-3 w-3" />
						All languages
					</Link>
					<h1 className="text-2xl font-semibold">
						Chat with the {languageLabel ?? lang} phrasebook
					</h1>
					<p className="text-muted-foreground text-sm">
						Ask in plain English — the chat surfaces flashcards that match what
						you want to say. Tap the + on a card to collect it, then use your
						selection to pivot to similar phrases.
					</p>
				</div>
				<CartButton />
			</header>

			<div
				data-testid="chat-conversation"
				className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1"
			>
				{turns.length === 0 ? (
					<div
						data-testid="chat-empty-state"
						className="text-muted-foreground my-8 text-center text-sm"
					>
						Try: <em>&ldquo;what do I say if I'm going to the store?&rdquo;</em>
					</div>
				) : (
					turns.map((turn) => <ChatTurnView key={turn.id} turn={turn} />)
				)}
				<div ref={bottomRef} />
			</div>

			<SelectionBar />
			<ChatInput />
		</div>
	)
}
