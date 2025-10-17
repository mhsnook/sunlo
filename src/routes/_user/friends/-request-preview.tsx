import { Link } from '@tanstack/react-router'
import { LinkIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { uuid } from '@/types/main'
import { buttonVariants } from '@/components/ui/button-variants'
import { Loader } from '@/components/ui/loader'
import { usePhrasesFromRequest, useRequest } from '@/hooks/use-requests'
import { LangBadge } from '@/components/ui/badge'

export function RequestPreview({
	id,
	lang,
	isMine,
}: {
	id: uuid
	lang: string
	isMine: boolean
}) {
	const { data: request, isLoading } = useRequest(id)
	const { data: answers, isLoading: isLoadingPhrases } =
		usePhrasesFromRequest(id)

	if (!isLoading && !request)
		return (
			<Callout variant="problem">Can't seem to find that request...</Callout>
		)

	return (
		<Card
			className={`bg-background mt relative z-10 -mb-1 ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
		>
			{isLoading || !request ?
				<Loader className="my-6" />
			:	<>
					<CardHeader className="p-4">
						<CardTitle className="flex flex-row items-center justify-between gap-1 text-lg">
							<span>Phrase request </span>
							<LangBadge lang={request.lang} />
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 p-4 pt-0">
						<p>&ldquo;{request.prompt}&rdquo;</p>
						<p className="text-muted-foreground text-sm">
							{answers.length} answer{answers.length === 1 ? '' : 's'}
						</p>

						<div className="flex flex-row flex-wrap gap-2">
							{/* <RequestHeartButton pid={id} lang={lang} /> */}

							<Link
								to={'/learn/$lang/requests/$id'}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang, id }}
								className={buttonVariants({
									variant: 'secondary',
									size: 'sm',
								})}
							>
								<LinkIcon className="text-muted-foreground" />
								View request
							</Link>
						</div>
					</CardContent>
				</>
			}
		</Card>
	)
}
