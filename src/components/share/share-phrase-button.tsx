import type { ButtonProps } from '@/components/ui/button'
import { Share } from 'lucide-react'
import { toastError } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import languages from '@/lib/languages'
import {
	canShareLink,
	isShareCancelled,
	shareLink,
	webOrigin,
} from '@/lib/platform'
import { PhraseFullFilteredType } from '@/features/phrases/schemas'

export default function SharePhraseButton({
	phrase,
	text = 'Share phrase',
	variant = 'ghost',
	size = 'sm',
	...props
}: {
	phrase: PhraseFullFilteredType
	text?: string
	variant?: string
	size?: string
} & ButtonProps) {
	const sharePhrase = () => {
		if (!phrase) return
		void shareLink({
			title: `Sunlo: ${phrase.text}`,
			text: `Check out this phrase in ${languages[phrase.lang]}: ${phrase.text}`,
			url: `${webOrigin}/learn/${phrase.lang}/${phrase.id}`,
		}).catch((error: unknown) => {
			if (!isShareCancelled(error)) toastError('Failed to share')
		})
	}

	if (!phrase || !canShareLink) return null
	return (
		<Button
			onClick={sharePhrase}
			variant={variant}
			size={size}
			aria-label="Share phrase"
			{...props}
		>
			<Share className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @md:block">{text}</span>}
		</Button>
	)
}
