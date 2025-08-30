import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { ButtonProps } from '@/components/ui/button-variants'
import { useCallback } from 'react'

export default function CopyLinkButton({
	url,
	text = 'Copy link',
	variant = 'ghost',
	size = 'badge',
	className = '',
	collapse = true,
	...props
}: {
	url?: string
	text?: string
	variant?: string
	size?: string
	className?: string
	collapse?: boolean
} & ButtonProps) {
	const copyLink = useCallback(() => {
		// @TODO this is not working on my laptop (anymore) idk why
		if (!navigator?.clipboard) toast.error('Failed to copy link')
		else
			navigator.clipboard
				.writeText(url || window?.location?.href)
				.then(() => {
					toast.success('Link copied to clipboard')
				})
				.catch(() => {
					toast.error('Failed to copy link')
				})
	}, [url])

	return (
		<Button
			onClick={copyLink}
			variant={variant}
			size={size}
			className={className}
			{...props}
		>
			<Copy className="h-4 w-4" />
			<span className={collapse ? 'hidden @sm:block' : ''}>{text}</span>
		</Button>
	)
}
