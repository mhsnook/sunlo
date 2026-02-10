import { Copy } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { copyLink } from '@/lib/utils'

export default function CopyLinkButton({
	url,
	text = 'Copy Link',
	variant = 'ghost',
	size = 'sm',
	collapse = true,
	...props
}: {
	url?: string
	text?: string
	variant?: string
	size?: string
	collapse?: boolean
} & ButtonProps) {
	const copy = () => copyLink(url)
	return (
		<Button
			onClick={copy}
			variant={variant}
			size={size}
			aria-label="Copy link"
			data-testid="copy-link-button"
			{...props}
		>
			<Copy className="h-4 w-4" />
			<span className={collapse ? 'hidden @md:block' : ''}>{text}</span>
		</Button>
	)
}
