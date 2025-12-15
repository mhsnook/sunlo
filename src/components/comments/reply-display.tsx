// Helper component for rendering individual replies
import type { RequestCommentType } from '@/lib/schemas'
import UserPermalink from '../card-pieces/user-permalink'
import { Markdown } from '../my-markdown'
import { CardResultSimple } from '../cards/card-result-simple'
import { usePhrasesFromComment } from '@/hooks/use-comments'

interface ReplyDisplayProps {
	reply: RequestCommentType & {
		profile?: { username: string; avatar_path: string }
	}
	lang: string
}

function ReplyDisplay({ reply, lang }: ReplyDisplayProps) {
	// Get phrases for this reply
	const { data: replyPhraseData } = usePhrasesFromComment(reply.id)

	const replyPhrases = replyPhraseData ?? []

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<UserPermalink
					uid={reply.commenter_uid}
					username={reply.profile?.username ?? ''}
					avatar_path={reply.profile?.avatar_path ?? ''}
					timeValue={reply.created_at}
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkParams={{ id: reply.request_id, lang }}
					timeLinkTo="/learn/$lang/requests/$id"
				/>
			</div>

			{reply.content && (
				<div className="text-base">
					<Markdown>{reply.content}</Markdown>
				</div>
			)}

			{/* Reply flashcards */}
			{replyPhrases && replyPhrases.length > 0 && (
				<div className="mt-2 space-y-2">
					{replyPhrases.map((phrase) => (
						<CardResultSimple key={phrase.id} phrase={phrase} />
					))}
				</div>
			)}
		</div>
	)
}

export { ReplyDisplay }
