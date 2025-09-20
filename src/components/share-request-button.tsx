import { useCallback } from 'react'
import type { ButtonProps } from '@/components/ui/button-variants'
import type { uuid } from '@/types/main'
import { Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import languages from '@/lib/languages'
import { useQuery } from '@tanstack/react-query'
import { phraseRequestQuery } from '@/hooks/use-requests'

export default function ShareRequestButton({
	lang,
	id,
	text = 'Share request',
	variant = 'ghost',
	size = 'sm',
	className = '',
	...props
}: {
	lang: string
	id: uuid
	text?: string
	variant?: string
	size?: string
	className?: string
} & ButtonProps) {
	const { data: request, isPending } = useQuery(phraseRequestQuery(id))

	const sharePhrase = useCallback(() => {
		navigator
			.share({
				title: `Sunlo: ${request?.prompt}`,
				text: `Check out this request for a phrase in ${languages[lang]}: ${request!.prompt}`,
				url: `${window.location.origin}/learn/${lang}/requests/${request?.id}`,
			})
			.catch(() => {
				toast.error('Failed to share')
			})
	}, [request, lang])

	if (isPending || !request || !navigator.share) return null
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
