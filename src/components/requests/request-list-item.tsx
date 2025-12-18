import { PhraseRequestType } from '@/lib/schemas'
import { useRequestAnswers } from '@/hooks/use-language'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { CardContent, CardFooter } from '@/components/ui/card'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Markdown } from '@/components/my-markdown'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/requests/request-header'
import { RequestButtonsRow } from './request-buttons-row'

export function RequestItem({ request }: { request: PhraseRequestType }) {
	const { data: answers } = useRequestAnswers(request.id)
	const { data: profile } = useOnePublicProfile(request.requester_uid)

	return !request ? null : (
			<CardlikeRequest className="group">
				<RequestHeader
					request={request}
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					profile={profile}
				/>
				<CardContent>
					<div className="text-lg">
						<Markdown>{request.prompt}</Markdown>
					</div>

					<p className="text-muted-foreground mt-4 text-sm">
						{answers?.length || 'No'} answers {answers?.length ? '' : 'yet'}
					</p>
					<ScrollArea className="flex w-full flex-row justify-start gap-2">
						<div className="flex w-full flex-row justify-start gap-2">
							{answers?.map((p) => <PhraseTinyCard key={p.id} pid={p.id} />)}
						</div>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				</CardContent>
				<CardFooter className="flex flex-col gap-4 border-t py-4">
					<RequestButtonsRow requestId={request.id} lang={request.lang} />
				</CardFooter>
			</CardlikeRequest>
		)
}
