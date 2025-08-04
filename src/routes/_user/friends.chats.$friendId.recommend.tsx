import { useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ChatMessageInsert, uuid } from '@/types/main'
import toast from 'react-hot-toast'
import { ChevronLeft, Send } from 'lucide-react'
import { useDebounce } from '@uidotdev/usehooks'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

export const Route = createFileRoute(
	'/_user/friends/chats/$friendId/recommend'
)({
	component: RouteComponent,
})

function RouteComponent() {
	const { friendId } = Route.useParams()
	const { userId } = useAuth()
	const navigate = useNavigate({ from: Route.fullPath })

	const [lang, setLang] = useState<string>('')
	const [searchTerm, setSearchTerm] = useState('')
	const [debouncedSearchTerm] = useDebounce(searchTerm, 500)

	const searchQuery = useMemo(() => {
		return (debouncedSearchTerm ?? '').split(' ').filter(Boolean).join(' & ')
	}, [debouncedSearchTerm])

	const phrasesQuery = useQuery({
		queryKey: ['phrases-search', searchQuery, lang],
		queryFn: async () => {
			if (!searchQuery) return []
			const match = lang ? { lang } : {}
			const { data, error } = await supabase
				.from('phrase')
				.select('id, text')
				.match(match)
				.ilike('text', `%${searchQuery}%`)
				.limit(10)

			if (error) {
				toast.error(error.message)
				throw error
			}
			return data
		},
		enabled: !!searchQuery,
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
		if (!userId || !lang) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: friendId,
			phrase_id: phraseId,
			lang,
			message_type: 'recommendation',
		})
	}

	return (
		<Dialog
			open={true}
			onOpenChange={(open) => {
				if (!open) {
					void navigate({
						to: '/friends/chats/$friendId',
						params: { friendId },
					})
				}
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Send a phrase</DialogTitle>
				</DialogHeader>
				<div className="flex flex-1 flex-col gap-4 py-4">
					<SelectOneOfYourLanguages value={lang} setValue={setLang} />
					<Input
						placeholder="Search for a phrase to send..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
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
				</div>
			</DialogContent>
		</Dialog>
	)
}
