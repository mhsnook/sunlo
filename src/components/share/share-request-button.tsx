import { toastError } from '@/components/ui/sonner'
import { Share } from 'lucide-react'

import type { uuid } from '@/types/main'
import type { ButtonProps } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import languages from '@/lib/languages'
import { useRequest } from '@/features/requests/hooks'
import {
	canShareLink,
	isShareCancelled,
	shareLink,
	webOrigin,
} from '@/lib/native'

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

	const shareRequest = () => {
		if (!request) return
		void shareLink({
			title: `Sunlo: ${request.prompt}`,
			text: `Check out this request for a phrase in ${languages[request.lang]}: ${request.prompt}`,
			url: `${webOrigin}/learn/${request.lang}/requests/${request.id}`,
		}).catch((error: unknown) => {
			if (!isShareCancelled(error)) toastError('Failed to share')
		})
	}

	if (!request || !canShareLink) return null
	return (
		<Button
			onClick={shareRequest}
			variant={variant}
			size={size}
			className={className}
			aria-label="Share request"
			data-testid="share-request-button"
			{...props}
		>
			<Share className="h-4 w-4" />
			{size !== 'icon' && <span className="hidden @sm:block">{text}</span>}
		</Button>
	)
}
