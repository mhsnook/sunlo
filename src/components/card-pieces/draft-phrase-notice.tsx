import { useState } from 'react'
import { BadgeCheck, PencilLine } from 'lucide-react'

import type { uuid } from '@/types/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { confirmDraftPhrase } from '@/features/phrases/mutations'
import { useProfile } from '@/features/profile/hooks'
import languages from '@/lib/languages'
import { useAuth } from '@/lib/use-auth'

export function DraftBadge() {
	return (
		<Badge variant="outline" className="gap-1" data-testid="draft-badge">
			Draft <PencilLine className="size-3" />
		</Badge>
	)
}

function useCanConfirmDraft(lang: string) {
	const { isAdmin } = useAuth()
	const { data: profile } = useProfile()
	return (
		isAdmin ||
		!!profile?.languages_known.some(
			(known) => known.lang === lang && known.level === 'fluent'
		)
	)
}

export function DraftPhraseNotice({
	phraseId,
	lang,
}: {
	phraseId: uuid
	lang: string
}) {
	const canConfirm = useCanConfirmDraft(lang)
	const [isConfirming, setIsConfirming] = useState(false)

	const confirm = async () => {
		setIsConfirming(true)
		const tx = confirmDraftPhrase({ phraseId })
		try {
			await tx.isPersisted.promise
			toastSuccess('Phrase confirmed')
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			toastError(`Couldn't confirm this phrase: ${message}`)
		} finally {
			setIsConfirming(false)
		}
	}

	return (
		<Callout variant="ghost" size="sm" Icon={PencilLine}>
			<p className="text-sm" data-testid="draft-phrase-notice">
				This phrase is a draft. A fluent {languages[lang]} speaker hasn't
				checked the text and translation yet.
			</p>
			{canConfirm && (
				<Button
					size="sm"
					variant="soft"
					onClick={() => void confirm()}
					disabled={isConfirming}
					data-testid="confirm-draft-button"
				>
					<BadgeCheck />
					It's correct
				</Button>
			)}
		</Callout>
	)
}
