import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ChatMessageInsert, uuid } from '@/types/main'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'
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
import { ShowErrorDontLog } from '@/components/errors'
import { Loader } from '@/components/ui/loader'
import Callout from '@/components/ui/callout'
import { Label } from '@/components/ui/label'

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

	const {
		data: phrasesData,
		error,
		isFetching,
	} = useQuery({
		queryKey: ['phrases-search', searchQuery, lang],
		queryFn: async () => {
			if (!searchQuery) return []
			const match = lang ? { lang } : {}
			const { data } = await supabase
				.from('phrase')
				.select('id, text, lang')
				.match(match)
				.ilike('text', `%${searchQuery}%`)
				.limit(10)
				.throwOnError()

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
			toast.success('Phrase sent!')
		},
		onError: (error) => {
			toast.error(`Failed to send recommendation: ${error.message}`)
		},
	})

	const handleRecommend = (phraseId: uuid, lang: string) => {
		if (!userId) return
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
			<DialogContent className="max-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Send a phrase</DialogTitle>
				</DialogHeader>
				<div className="flex flex-1 flex-col gap-4 py-4">
					<Label>
						<p className="mb-2">Optional language filter</p>
						<SelectOneOfYourLanguages value={lang} setValue={setLang} />
					</Label>
					<Label>
						<p className="mb-2">Search terms *</p>
						<Input
							placeholder="Search for a phrase to send..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</Label>
					<ScrollArea className="flex-1">
						<div className="flex min-h-20 flex-1 flex-col place-content-center gap-2">
							{isFetching && <Loader />}
							{phrasesData?.map((phrase) => (
								<div
									key={phrase.id}
									className="flex items-center justify-between rounded-md border p-2"
								>
									<p className="flex-1">{phrase.text}</p>
									<Button
										size="sm"
										onClick={() => handleRecommend(phrase.id, phrase.lang)}
										disabled={sendMessageMutation.isPending}
									>
										<Send className="mr-2 h-4 w-4" />
										Send
									</Button>
								</div>
							))}
							{phrasesData?.length === 0 && debouncedSearchTerm && (
								<Callout variant="ghost">No phrases found.</Callout>
							)}
							{!debouncedSearchTerm && (
								<Callout variant="ghost">Enter search terms above</Callout>
							)}
							{error && (
								<ShowErrorDontLog
									error={error}
									text="An error has occurred trying to complete your search"
								/>
							)}
						</div>
					</ScrollArea>
				</div>
			</DialogContent>
		</Dialog>
	)
}
