import type { ButtonProps } from '@/components/ui/button-variants'
import type { uuid } from '@/types/main'
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
	size = 'badge',
	className = '',
	...props
}: {
	lang: string
	pid: uuid
	text?: string
	variant?: string
	size?: string
	className?: string
} & ButtonProps) {
	const { data: phrase, isPending } = useLanguagePhrase(pid, lang)
	if (isPending || !phrase || !navigator.share) return null

	const shareContent = {
		title: `Sunlo: ${phrase.text}`,
		text: `Check out this phrase in ${languages[lang]}: ${phrase.text}`,
		url: `${window.location.origin}/learn/${lang}/${phrase.id}`,
	}

	const sharePhrase = () => {
		navigator.share(shareContent).catch(() => {
			toast.error('Failed to share')
		})
	}
	return (
		<Button
			onClick={sharePhrase}
			variant={variant}
			size={size}
			className={className}
			{...props}
		>
			<Share2 className="h-4 w-4" />
			<span className="hidden @xl:block">{text}</span>
		</Button>
	)
}
