import { Link } from '@tanstack/react-router'
import { LinkIcon } from 'lucide-react'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { uuid } from '@/types/main'
import { buttonVariants } from '@/components/ui/button-variants'
import { Loader } from '@/components/ui/loader'
import { useRequestLinks, useRequest } from '@/hooks/use-requests'
import { LangBadge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'

export function RequestPreview({ id }: { id: uuid }) {
	const { data: request, isLoading } = useRequest(id)
	const { data: links, isLoading: isLoadingPhrases } = useRequestLinks(id)

	if (!isLoading && !request)
		return (
			<Callout variant="problem">Can't seem to find that request...</Callout>
		)

	return (
		<CardlikeRequest className="relative z-10">
			{isLoading || !request ?
				<Loader className="my-6" />
			:	<>
					<CardHeader className="border-b-primary-foresoft/30 mx-4 mb-4 border-b px-0 py-4">
						<CardTitle className="flex flex-row items-center justify-between gap-1 text-lg">
							<span>Phrase request </span>
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

						<div className="flex flex-row flex-wrap gap-2">
							{/* <RequestHeartButton pid={id} lang={lang} /> */}

							<Link
								to={'/learn/$lang/requests/$id'}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang: request.lang, id }}
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
		</CardlikeRequest>
	)
}
