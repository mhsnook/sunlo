import type { ButtonProps } from '@/components/ui/button'
import { Share } from 'lucide-react'
import { toastError } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import languages from '@/lib/languages'
import { PhraseFullFilteredType } from '@/lib/schemas'

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
		navigator
			.share({
				title: `Sunlo: ${phrase.text}`,
				text: `Check out this phrase in ${languages[phrase.lang]}: ${phrase.text}`,
				url: `${window.location.origin}/learn/${phrase.lang}/${phrase.id}`,
			})
			.catch((error: DOMException) => {
				if (error.name !== 'AbortError') {
					toastError('Failed to share')
				}
			})
	}

	if (!phrase || !navigator.share) return null
	return (
		<Button onClick={sharePhrase} variant={variant} size={size} {...props}>
			<Share className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @md:block">{text}</span>}
		</Button>
	)
}
