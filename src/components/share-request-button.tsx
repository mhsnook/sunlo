import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { Share } from 'lucide-react'

import type { uuid } from '@/types/main'
import type { ButtonProps } from '@/components/ui/button-variants'
import { Button } from '@/components/ui/button'
import languages from '@/lib/languages'
import { useRequest } from '@/hooks/use-requests'

export function ShareRequestButton({
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
	const { data: request, isLoading } = useRequest(id)

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

	if (isLoading || !request || !navigator.share) return null
	return (
		<Button
			onClick={sharePhrase}
			variant={variant}
			size={size}
			className={className}
			{...props}
		>
			<Share className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @sm:block">{text}</span>}
		</Button>
	)
}
