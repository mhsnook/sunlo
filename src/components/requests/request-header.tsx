import { PhraseRequestType, PublicProfileType } from '@/lib/schemas'
import { CardDescription, CardHeader } from '@/components/ui/card'
import UserPermalink from '../card-pieces/user-permalink'
import { LangBadge } from '@/components/ui/badge'

export function RequestHeader({
	request,
	profile,
}: {
	request: PhraseRequestType
	profile: undefined | PublicProfileType
}) {
	return (
		<CardHeader className="border-primary-foresoft/20 mb-6 border-b pb-4">
			<div className="flex flex-row items-center justify-between gap-2">
				{profile && (
					<UserPermalink
						username={profile.username}
						avatar_path={profile.avatar_path}
						uid={request.requester_uid}
						timeLinkTo="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						timeLinkParams={{ lang: request.lang, id: request.id }}
						timeValue={request.created_at}
					/>
				)}
				<div className="flex flex-row items-center gap-2">
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
