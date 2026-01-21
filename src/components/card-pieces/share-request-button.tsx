import { toastError } from '@/components/ui/sonner'
import { Share } from 'lucide-react'

import type { uuid } from '@/types/main'
import type { ButtonProps } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import languages from '@/lib/languages'
import { useRequest } from '@/hooks/use-requests'

export function ShareRequestButton({
	id,
	text = 'Share request',
	variant = 'ghost',
	size = 'sm',
	className = '',
	...props
}: {
	id: uuid
	text?: string
	variant?: string
	size?: string
	className?: string
} & ButtonProps) {
	const { data: request } = useRequest(id)

	const sharePhrase = () => {
		if (!request) return
		navigator
			.share({
				title: `Sunlo: ${request?.prompt}`,
				text: `Check out this request for a phrase in ${languages[request.lang]}: ${request.prompt}`,
				url: `${window.location.origin}/learn/${request.lang}/requests/${request.id}`,
			})
			.catch(() => {
				toastError('Failed to share')
			})
	}

	if (!request || !navigator.share) return null
	return (
		<Button
			onClick={sharePhrase}
			variant={variant}
			size={size}
			className={className}
			title="Share request"
			data-testid="share-request-button"
			{...props}
		>
			<Share className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @sm:block">{text}</span>}
		</Button>
	)
}
