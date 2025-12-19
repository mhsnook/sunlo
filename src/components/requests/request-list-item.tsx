import { PhraseRequestType } from '@/lib/schemas'
import { useRequestLinksPhraseIds } from '@/hooks/use-requests'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { CardContent, CardFooter } from '@/components/ui/card'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Markdown } from '@/components/my-markdown'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/requests/request-header'
import { RequestButtonsRow } from './request-buttons-row'
import { useNavigate } from '@tanstack/react-router'

export function RequestItem({ request }: { request: PhraseRequestType }) {
	const { data: links } = useRequestLinksPhraseIds(request.id)
	const { data: profile } = useOnePublicProfile(request.requester_uid)
	const navigate = useNavigate()

	return !request ? null : (
			<CardlikeRequest
				className="group hover:bg-primary/0 cursor-pointer"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={(e) => {
					const target = e.target as HTMLElement
					if (!e.currentTarget.contains(target)) return
					if (target.closest('button, a, input')) return
					void navigate({
						to: '/learn/$lang/requests/$id',
						params: { lang: request.lang, id: request.id },
					})
				}}
			>
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
						{links?.length || 'No'} answers {links?.length ? '' : 'yet'}
					</p>
					<ScrollArea className="flex w-full flex-row justify-start gap-2">
						<div className="flex w-full flex-row justify-start gap-2">
							{links?.map((l) => (
								<PhraseTinyCard key={l.phrase_id} pid={l.phrase_id} />
							))}
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
