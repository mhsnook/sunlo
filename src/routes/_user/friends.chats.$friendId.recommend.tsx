import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ChatMessageInsert, uuid } from '@/types/main'
import toast from 'react-hot-toast'
import { ArrowLeft, Send } from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectOneLanguage } from '@/components/select-one-language'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute(
	'/_user/friends/chats/$friendId/recommend'
)({
	component: RouteComponent,
})

function RouteComponent() {
	const { friendId } = Route.useParams()
	const { userId } = useAuth()
	const navigate = useNavigate({ from: Route.fullPath })

	const [language, setLanguage] = useState<string>('')
	const [searchTerm, setSearchTerm] = useState('')
	const [debouncedSearchTerm] = useDebounce(searchTerm, 500)

	const searchQuery = useMemo(() => {
		return (debouncedSearchTerm ?? '')
			.split(' ')
			.filter(Boolean)
			.map((s) => `'''${s}'''`)
			.join(' & ')
	}, [debouncedSearchTerm])

	const phrasesQuery = useQuery({
		queryKey: ['phrases-search', searchQuery, language],
		queryFn: async () => {
			if (!searchQuery || !language) return []
			const { data, error } = await supabase
				.from('phrase')
				.select('id, text')
				.eq('lang', language)
				.textSearch('text', searchQuery, {
					type: 'websearch',
					config: 'simple',
				})
				.limit(10)

			if (error) {
				toast.error(error.message)
				throw error
			}
			return data
		},
		enabled: !!searchQuery && !!language,
	})

	const sendMessageMutation = useMutation({
		mutationFn: async (newMessage: ChatMessageInsert) => {
			const { error } = await supabase.from('chat_message').insert(newMessage)
			if (error) throw error
		},
		onSuccess: () => {
			void navigate({ to: '/friends/chats/$friendId', params: { friendId } })
		},
		onError: (error) => {
			toast.error(`Failed to send recommendation: ${error.message}`)
		},
	})

	const handleRecommend = (phraseId: uuid) => {
		if (!userId || !language) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: friendId,
			phrase_id: phraseId,
			lang: language,
			message_type: 'recommendation',
		})
	}

	return (
		<Card className="my-2 flex h-full flex-col">
			<CardHeader className="flex flex-row items-center gap-4 border-b p-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() =>
						void navigate({
							to: '/friends/chats/$friendId',
							params: { friendId },
						})
					}
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<CardTitle className="text-base">Recommend a phrase</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-4 p-4">
				<SelectOneLanguage value={language} setValue={setLanguage} />
				<Input
					placeholder="Search for a phrase to send..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					disabled={!language}
				/>
				<ScrollArea className="flex-1">
					<div className="space-y-2">
						{phrasesQuery.isPending && <p>Loading...</p>}
						{phrasesQuery.data?.map((phrase) => (
							<div
								key={phrase.id}
								className="flex items-center justify-between rounded-md border p-2"
							>
								<p className="flex-1">{phrase.text}</p>
								<Button
									size="sm"
									onClick={() => handleRecommend(phrase.id)}
									disabled={sendMessageMutation.isPending}
								>
									<Send className="mr-2 h-4 w-4" />
									Send
								</Button>
							</div>
						))}
						{phrasesQuery.data?.length === 0 && debouncedSearchTerm && (
							<p className="text-muted-foreground text-center">
								No phrases found.
							</p>
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	)
}
