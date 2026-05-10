import { PhraseRequestType } from '@/features/requests/schemas'
import { CardDescription, CardHeader } from '@/components/ui/card'
import { UidPermalink } from '../card-pieces/user-permalink'
import { LangBadge } from '@/components/ui/badge'
import { useProfile } from '@/features/profile/hooks'
import { UpdateRequestDialog } from './update-request-dialog'
import { DeleteRequestDialog } from './delete-request-dialog'

export function RequestHeader({ request }: { request: PhraseRequestType }) {
	const { data: profile } = useProfile()
	const isOwner = profile?.uid === request.requester_uid

	return (
		<CardHeader className="border-2-lo-primary py-3 @md:py-6">
			<div className="flex flex-row items-center justify-between gap-2">
				<UidPermalink
					uid={request.requester_uid}
					action="posted a Request"
					timeLinkTo="/learn/$lang/requests/$id"
					timeLinkParams={{ lang: request.lang, id: request.id }}
					timeValue={request.created_at}
				/>
				<div className="flex flex-col-reverse items-center gap-2 @md:flex-row">
					{isOwner && (
						<div className="flex flex-row items-center gap-2">
							<UpdateRequestDialog request={request} />
							<DeleteRequestDialog request={request} />
						</div>
					)}
					<LangBadge lang={request.lang} />
				</div>
			</div>
			<CardDescription className="sr-only">
				A request for assistance, and a comments thread for other users to
				discuss and answer with comments, flash card recommendations, or both.
			</CardDescription>
		</CardHeader>
	)
}
