import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '../ui/callout'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '../ui/button-variants'
import { LinkIcon } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useQuery } from '@tanstack/react-query'
import { phraseRequestQuery } from '@/hooks/use-requests'
import { LangBadge } from '../ui/badge'

export function RequestPreview({
	id,
	lang,
	isMine,
}: {
	id: uuid
	lang: string
	isMine: boolean
}) {
	const { data: request, isPending } = useQuery(phraseRequestQuery(id))

	if (!isPending && !request)
		return (
			<Callout variant="problem">Can't seem to find that request...</Callout>
		)
	const answers = Array.isArray(request?.phrases) ? request.phrases : []

	return (
		<Card
			className={`bg-background mt relative z-10 -mb-1 ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
		>
			{isPending || !request ?
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
