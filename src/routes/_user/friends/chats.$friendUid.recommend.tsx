import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Send } from 'lucide-react'

import type { uuid } from '@/types/main'
import type { TablesInsert } from '@/types/supabase'
import { PhraseFullFilteredType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'

import { Input } from '@/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LangBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import PermalinkButton from '@/components/permalink-button'
import { DisplayPhrasesQuery } from '@/components/display-phrase-query'

export const Route = createFileRoute(
	'/_user/friends/chats/$friendUid/recommend'
)({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const userId = useUserId()
	const navigate = useNavigate({ from: Route.fullPath })

	const [lang, setLang] = useState<string>('')
	const [searchTerm, setSearchTerm] = useState('')

	const sendMessageMutation = useMutation({
		mutationFn: async (newMessage: TablesInsert<'chat_message'>) => {
			const { error } = await supabase.from('chat_message').insert(newMessage)
			if (error) throw error
		},
		onSuccess: () => {
			void navigate({ to: '/friends/chats/$friendUid', params })
			toastSuccess('Phrase sent!')
		},
		onError: (error) => {
			toastError(`Failed to send recommendation: ${error.message}`)
		},
	})

	const handleRecommend = (phraseId: uuid, lang: string) => {
		if (!userId) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: params.friendUid,
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
						to: '/friends/chats/$friendUid',
						params,
					})
				}
			}}
		>
			<DialogContent className="max-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Send a phrase</DialogTitle>
					<DialogDescription className="sr-only">
						A form to search for phrases to send to your friend
					</DialogDescription>
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
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</Label>
					<DisplayPhrasesQuery
						lang={lang}
						text={searchTerm}
						renderItem={(phrase: PhraseFullFilteredType) => (
							<div
								key={phrase.id}
								className="flex items-start justify-between gap-2 rounded-md border p-2"
							>
								<LangBadge lang={phrase.lang} className="my-1" />
								<p className="my-0.5 flex-1">{phrase.text}</p>
								<PermalinkButton
									size="icon"
									from={Route.fullPath}
									text=""
									to="/learn/$lang/phrases/$id"
									params={{ lang: phrase.lang, id: phrase.id }}
								/>
								<Button
									size="icon"
									onClick={() => handleRecommend(phrase.id, phrase.lang)}
									disabled={sendMessageMutation.isPending}
								>
									<Send className="-ms-0.5 mt-0.5" />
								</Button>
							</div>
						)}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}
