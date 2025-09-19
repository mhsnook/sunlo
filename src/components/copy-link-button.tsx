import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { ButtonProps } from '@/components/ui/button-variants'
import { useCallback } from 'react'

export function copyLink(url?: string, fallback = true) {
	if (!navigator?.clipboard) toast.error('Failed to copy link')
	if (!fallback && !url) {
		throw new Error('No url to copy')
	} else
		navigator.clipboard
			.writeText(url ?? window?.location?.href)
			.then(() => {
				toast.success('Link copied to clipboard')
			})
			.catch(() => {
				toast.error('Failed to copy link')
			})
}

export default function CopyLinkButton({
	url,
	text = 'Copy link',
	variant = 'ghost',
	size = 'sm',
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
	const copy = useCallback(() => copyLink(url), [url])
	return (
		<Button
			onClick={copy}
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
