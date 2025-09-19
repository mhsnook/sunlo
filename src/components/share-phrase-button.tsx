import { useCallback } from 'react'
import type { ButtonProps } from '@/components/ui/button-variants'
import type { OnePhraseComponentProps } from '@/types/main'
import { Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { useLanguagePhrase } from '@/lib/use-language'
import languages from '@/lib/languages'

export default function SharePhraseButton({
	lang,
	pid,
	text = 'Share phrase',
	variant = 'ghost',
	size = 'sm',
	className = '',
	...props
}: OnePhraseComponentProps & {
	text?: string
	variant?: string
	size?: string
	className?: string
} & ButtonProps) {
	const { data: phrase, isPending } = useLanguagePhrase(pid, lang)

	const sharePhrase = useCallback(() => {
		navigator
			.share({
				title: `Sunlo: ${phrase!.text}`,
				text: `Check out this phrase in ${languages[lang]}: ${phrase!.text}`,
				url: `${window.location.origin}/learn/${lang}/${phrase!.id}`,
			})
			.catch(() => {
				toast.error('Failed to share')
			})
	}, [phrase, lang])

	if (isPending || !phrase || !navigator.share) return null
	return (
		<Button
			onClick={sharePhrase}
			variant={variant}
			size={size}
			className={className}
			{...props}
		>
			<Share2 className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @sm:block">{text}</span>}
		</Button>
	)
}
