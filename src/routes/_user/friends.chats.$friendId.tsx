import { createFileRoute } from '@tanstack/react-router'
import { useOneRelation } from '@/lib/friends'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_user/friends/chats/$friendId')({
	component: ChatPage,
})

// Mock data for chat messages
const mockMessages = [
	{
		id: 1,
		sender: 'friend',
		type: 'recommendation',
		phrase: {
			id: 'mock-phrase-1',
			text: '¿Cómo estás?',
			lang: 'spa',
			translation: 'How are you?',
		},
		timestamp: '10:30 AM',
	},
	{
		id: 2,
		sender: 'me',
		type: 'recommendation',
		phrase: {
			id: 'mock-phrase-2',
			text: 'Estoy bien, gracias.',
			lang: 'spa',
			translation: "I'm fine, thank you.",
		},
		timestamp: '10:32 AM',
	},
	{
		id: 3,
		sender: 'friend',
		type: 'accepted',
		phraseText: 'Estoy bien, gracias.',
		timestamp: '10:35 AM',
	},
	{
		id: 4,
		sender: 'friend',
		type: 'recommendation',
		phrase: {
			id: 'mock-phrase-3',
			text: 'De nada.',
			lang: 'spa',
			translation: "You're welcome.",
		},
		timestamp: '10:36 AM',
	},
]

// A simplified card preview for the mock-up
function CardPreview({
	phrase,
}: {
	phrase: { id: string; text: string; lang: string; translation: string }
}) {
	// In a real implementation, this would use useDeckCard and useLanguagePhrase
	const mockCardStatus = useMemo(() => {
		const statuses = ['active', 'learned', 'not_in_deck']
		const status = statuses[Math.floor(Math.random() * statuses.length)]
		const nextReview =
			status === 'active' ? `in ${Math.ceil(Math.random() * 10)} days` : null
		return { status, nextReview }
	}, [phrase.id])

	return (
		<Card className="bg-background/50 my-2">
			<CardHeader className="p-4">
				<CardTitle className="text-lg">{phrase.text}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 p-4 pt-0">
				<p className="text-muted-foreground">{phrase.translation}</p>
				<div className="flex items-center gap-2 text-xs">
					{mockCardStatus.status === 'active' && (
						<Badge variant="secondary">In Deck</Badge>
					)}
					{mockCardStatus.status === 'learned' && (
						<Badge variant="outline">Learned</Badge>
					)}
					{mockCardStatus.status === 'not_in_deck' && (
						<Badge variant="destructive">Not in Deck</Badge>
					)}
					{mockCardStatus.nextReview && (
						<span className="text-muted-foreground">
							Next review: {mockCardStatus.nextReview}
						</span>
					)}
				</div>
				{mockCardStatus.status === 'not_in_deck' && (
					<Button size="sm" className="mt-2">
						Add to my Deck
					</Button>
				)}
			</CardContent>
		</Card>
	)
}

function ChatPage() {
	const { friendId } = Route.useParams()
	const { data: relation } = useOneRelation(friendId)

	if (!relation || !relation.profile) {
		return <div>Loading chat...</div>
	}

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="flex flex-row items-center gap-4 border-b p-4">
				<Avatar>
					<AvatarImage
						src={relation.profile.avatarUrl}
						alt={relation.profile.username}
					/>
					<AvatarFallback>
						{relation.profile.username.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<p className="font-semibold">{relation.profile.username}</p>
					<p className="text-muted-foreground text-xs">
						{relation.status === 'friends' ? 'Friends' : 'Pending'}
					</p>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				<ScrollArea className="h-[calc(100vh-20rem)] p-4">
					<div className="space-y-4">
						{mockMessages.map((msg) => {
							const isMe = msg.sender === 'me'
							return (
								<div
									key={msg.id}
									className={cn(
										'flex items-end gap-2',
										isMe ? 'justify-end' : 'justify-start'
									)}
								>
									{!isMe && (
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={relation.profile?.avatarUrl}
												alt={relation.profile?.username}
											/>
											<AvatarFallback>
												{relation.profile?.username.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									)}
									<div
										className={cn(
											'max-w-xs rounded-lg p-3 lg:max-w-md',
											isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
										)}
									>
										{msg.type === 'recommendation' && msg.phrase ?
											<CardPreview phrase={msg.phrase} />
										:	null}
										{msg.type === 'accepted' && (
											<p className="text-sm italic">
												You added "{msg.phraseText}" to your deck.
											</p>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</ScrollArea>
			</CardContent>
			<div className="border-t p-4">
				<form className="relative">
					<Input
						placeholder="Send a phrase recommendation..."
						disabled
						// This would open a search/add phrase dialog
					/>
					<Button
						type="submit"
						size="icon"
						className="absolute end-0 top-0"
						disabled
					>
						<Send className="h-4 w-4" />
					</Button>
				</form>
				<p className="text-muted-foreground pt-1 text-center text-xs">
					Phrase sending is not yet implemented.
				</p>
			</div>
		</Card>
	)
}
