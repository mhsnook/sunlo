import { Link } from '@tanstack/react-router'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'
import { useRequestLinksPhraseIds, useRequest } from '@/hooks/use-requests'
import { LangBadge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'

export function RequestPreview({ id }: { id: uuid }) {
	const { data: request, isLoading } = useRequest(id)
	const { data: links, isLoading: isLoadingPhrases } =
		useRequestLinksPhraseIds(id)

	if (isLoading) return <Loader className="my-6" />
	if (!request)
		return (
			<Callout variant="problem">Can't seem to find that request...</Callout>
		)

	return (
		<Link to={'/learn/$lang/requests/$id'} params={{ lang: request.lang, id }}>
			<CardlikeRequest className="relative z-10">
				<CardHeader className="border-b-primary-foresoft/30 mx-4 mb-4 border-b px-0 py-4">
					<CardTitle className="flex flex-row items-center justify-between gap-1 text-lg">
						<span>Phrase request</span>
						<LangBadge lang={request.lang} />
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 p-4 pt-0">
					<p>&ldquo;{request.prompt}&rdquo;</p>
					{isLoadingPhrases ? null : (
						<p className="text-muted-foreground text-sm">
							{links?.length} answer{links?.length === 1 ? '' : 's'}
						</p>
					)}
				</CardContent>
			</CardlikeRequest>
		</Link>
	)
}
