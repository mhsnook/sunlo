import { PhraseRequestType } from '@/lib/schemas'
import { CardDescription, CardHeader } from '@/components/ui/card'
import { UidPermalink } from '../card-pieces/user-permalink'
import { LangBadge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/use-profile'
import { UpdateRequestDialog } from './update-request-dialog'
import { DeleteRequestDialog } from './delete-request-dialog'

export function RequestHeader({ request }: { request: PhraseRequestType }) {
	const { data: profile } = useProfile()
	const isOwner = profile?.uid === request.requester_uid

	return (
		<CardHeader className="border-primary-foresoft/20 mb-6 border-b pb-4">
			<div className="flex flex-row items-center justify-between gap-2">
				<UidPermalink
					uid={request.requester_uid}
					action="posted a Request"
					timeLinkTo="/learn/$lang/requests/$id"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkParams={{ lang: request.lang, id: request.id }}
					timeValue={request.created_at}
				/>
				<div className="flex flex-row items-center gap-2">
					{isOwner && (
						<>
							<UpdateRequestDialog request={request} />
							<DeleteRequestDialog request={request} />
						</>
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
