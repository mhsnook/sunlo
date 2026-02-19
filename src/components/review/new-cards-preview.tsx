import { type CSSProperties } from 'react'
import { Eye } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { CardContent } from '@/components/ui/card'
import { LangBadge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { usePhrase } from '@/hooks/composite-phrase'
import type { pids, uuid } from '@/types/main'
import type { TranslationType } from '@/lib/schemas'

function PreviewCard({ pid }: { pid: uuid }) {
	const { data: phrase, status } = usePhrase(pid)

	if (status === 'not-found' || !phrase) return null

	const isReverse = phrase.only_reverse === true

	const phraseDisplay = (
		<div className="text-center text-xl font-bold">
			&ldquo;{phrase.text}&rdquo;
		</div>
	)

	const translationsDisplay = (
		<div className="w-full space-y-2">
			{phrase.translations?.map((trans: TranslationType) => (
				<div key={trans.id} className="flex items-center justify-center gap-2">
					<LangBadge lang={trans.lang} />
					<div className="text-base">{trans.text}</div>
				</div>
			))}
		</div>
	)

	return (
		<CardlikeFlashcard
			className="flex w-full max-w-lg flex-col"
			style={{ viewTransitionName: `preview-${pid}` } as CSSProperties}
		>
			<CardContent className="flex flex-col items-center justify-center gap-3 p-4">
				{isReverse ?
					<>
						{translationsDisplay}
						<Separator />
						{phraseDisplay}
					</>
				:	<>
						{phraseDisplay}
						<Separator />
						{translationsDisplay}
					</>
				}
			</CardContent>
		</CardlikeFlashcard>
	)
}

export function NewCardsPreview({ manifest }: { manifest: pids }) {
	const { lang } = useParams({ strict: false })
	const navigate = useNavigate()

	const handleStartReview = () => {
		void navigate({ to: '/learn/$lang/review/go', params: { lang: lang! } })
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex flex-col items-center gap-2 py-4 text-center">
				<div className="bg-foreground/80 text-background flex items-center gap-2 rounded-full px-4 py-2">
					<Eye className="size-5" />
					<span className="font-medium">Preview Today's Cards</span>
				</div>
				<p className="text-muted-foreground max-w-md text-sm">
					Scroll through your {manifest.length} card
					{manifest.length === 1 ? '' : 's'} before starting. Take a moment to
					familiarize yourself with them!
				</p>
			</div>

			<div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto rounded border px-2 py-4 shadow-inner">
				{manifest.map((pid) => (
					<PreviewCard key={pid} pid={pid} />
				))}
			</div>

			<div className="bg-muted mt-auto flex justify-center border-t p-4">
				<Button onClick={handleStartReview} size="lg" className="min-w-48">
					Start Review
				</Button>
			</div>
		</div>
	)
}
