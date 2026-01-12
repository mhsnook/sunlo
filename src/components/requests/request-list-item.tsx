import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { PhraseRequestType } from '@/lib/schemas'
import { useRequestLinksPhraseIds } from '@/hooks/use-requests'
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
	const navigate = useNavigate()

	const handleRequestClick = (
		e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
	) => {
		const target = e.target as HTMLElement
		if (!e.currentTarget?.contains(target)) return
		if (target.closest('button, a, input')) return
		void navigate({
			to: '/learn/$lang/requests/$id',
			params: { lang: request.lang, id: request.id },
		})
	}

	return !request ? null : (
			<CardlikeRequest
				className="group hover:bg-primary/0 cursor-pointer hover:shadow"
				style={
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					{ viewTransitionName: `request-${request.id}` } as CSSProperties
				}
				onClick={handleRequestClick}
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
					if (e.key === 'Enter') handleRequestClick(e)
					else return
				}}
				tabIndex={0}
				data-testid={`request-item-${request.id}`}
			>
				<RequestHeader request={request} />
				<CardContent>
					<div className="text-lg">
						<Markdown>{request.prompt}</Markdown>
					</div>

					<p className="text-muted-foreground mt-4 text-sm">
						{links?.length || 'No'} answer{links?.length === 1 ? '' : 's'}{' '}
						{links?.length ? '' : 'yet'}
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
					<RequestButtonsRow request={request} />
				</CardFooter>
			</CardlikeRequest>
		)
}
