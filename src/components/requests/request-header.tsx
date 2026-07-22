import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'

import { PhraseRequestType } from '@/features/requests/schemas'
import { CardDescription, CardHeader } from '@/components/ui/card'
import { UidPermalink } from '../card-pieces/user-permalink'
import { LangBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { useProfile } from '@/features/profile/hooks'
import { useAuth } from '@/lib/use-auth'
import { UpdateRequestDialog } from './update-request-dialog'
import { DeleteRequestDialog } from './delete-request-dialog'

export function RequestHeader({ request }: { request: PhraseRequestType }) {
	const { data: profile } = useProfile()
	const { isAdmin } = useAuth()
	const isOwner = profile?.uid === request.requester_uid

	return (
		<CardHeader className="border-lc-2 border-chroma-lo border-hue-primary py-3 @md:py-6">
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
					{isAdmin && (
						<Link
							to="/admin/$lang/requests/$id"
							params={{ lang: request.lang, id: request.id }}
							className={buttonVariants({ variant: 'ghost', size: 'icon' })}
							aria-label="Manage request (admin)"
							data-testid="admin-request-gear-link"
						>
							<Settings className="h-4 w-4" />
						</Link>
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
