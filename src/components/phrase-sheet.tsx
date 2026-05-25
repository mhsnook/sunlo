import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { ExternalLink, X } from 'lucide-react'

import type { uuid } from '@/types/main'
import { usePhrase } from '@/hooks/composite-phrase'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	ResponsiveSheet,
	ResponsiveSheetBody,
	ResponsiveSheetHeader,
} from '@/components/ui/responsive-sheet'

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
		<ResponsiveSheet
			open={!!pid}
			onOpenChange={(open) => {
				if (!open) close()
			}}
			title="Phrase Detail"
			description="Full details for this phrase including translations, tags, and related content."
		>
			{pid && <PhraseSheetInner pid={pid} onClose={close} />}
		</ResponsiveSheet>
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
			<ResponsiveSheetHeader>
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
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					aria-label="Close"
					data-testid="phrase-sheet-close"
				>
					<X className="h-4 w-4" />
				</Button>
			</ResponsiveSheetHeader>
			<ResponsiveSheetBody className="p-4">
				<BigPhraseCard pid={pid} />
			</ResponsiveSheetBody>
		</>
	)
}
