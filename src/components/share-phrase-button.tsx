import { useCallback } from 'react'
import type { ButtonProps } from '@/components/ui/button-variants'
import type { OnePhraseComponentProps } from '@/types/main'
import { Share } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { useLanguagePhrase } from '@/hooks/use-language'
import languages from '@/lib/languages'

export default function SharePhraseButton({
	pid,
	text = 'Share phrase',
	variant = 'ghost',
	size = 'sm',
	...props
}: OnePhraseComponentProps & {
	text?: string
	variant?: string
	size?: string
} & ButtonProps) {
	const { data: phrase, isLoading } = useLanguagePhrase(pid)

	const sharePhrase = useCallback(() => {
		if (!phrase) return
		navigator
			.share({
				title: `Sunlo: ${phrase.text}`,
				text: `Check out this phrase in ${languages[phrase.lang]}: ${phrase.text}`,
				url: `${window.location.origin}/learn/${phrase.lang}/${phrase.id}`,
			})
			.catch(() => {
				toast.error('Failed to share')
			})
	}, [phrase])

	if (isLoading || !phrase || !navigator.share) return null
	return (
		<Button onClick={sharePhrase} variant={variant} size={size} {...props}>
			<Share className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @md:block">{text}</span>}
		</Button>
	)
}
