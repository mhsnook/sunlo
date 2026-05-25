import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

import type { uuid } from '@/types/main'
import { usePhrase } from '@/hooks/composite-phrase'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { buttonVariants } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet'

export function PhraseSheet({ pid }: { pid: uuid | undefined }) {
	const navigate = useNavigate()

	const close = () => {
		void navigate({
			search: (prev: Record<string, unknown>) => {
				const { phrase: _, ...rest } = prev
				return rest
			},
			replace: true,
		})
	}

	return (
		<Sheet
			open={!!pid}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<SheetContent
				side="bottom"
				className="flex h-[88dvh] flex-col gap-0 overflow-hidden p-0"
			>
				<SheetTitle className="sr-only">Phrase Detail</SheetTitle>
				<SheetDescription className="sr-only">
					Full details for this phrase including translations, tags, and related
					content.
				</SheetDescription>
				{pid && <PhraseSheetInner pid={pid} onClose={close} />}
			</SheetContent>
		</Sheet>
	)
}

function PhraseSheetInner({
	pid,
	onClose,
}: {
	pid: uuid
	onClose: () => void
}) {
	const result = usePhrase(pid)
	const phrase =
		result.status !== 'pending' && result.status !== 'not-found'
			? result.data
			: undefined

	return (
		<>
			{/* Header: permalink on left, X handled by SheetContent's built-in button */}
			<div className="flex shrink-0 items-center border-b px-4 py-3 pe-14">
				{phrase ? (
					<Link
						to="/learn/$lang/phrases/$id"
						params={{ lang: phrase.lang, id: pid }}
						onClick={onClose}
						className={buttonVariants({ variant: 'ghost', size: 'sm' })}
						data-testid="phrase-sheet-open-page"
					>
						<ExternalLink className="me-1.5 h-4 w-4" />
						Open page
					</Link>
				) : (
					<div className="h-9" />
				)}
			</div>
			{/* Scrollable content */}
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				<BigPhraseCard pid={pid} />
			</div>
		</>
	)
}
