import { toastError } from '@/components/ui/sonner'
import { Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canShareLink, isShareCancelled, shareLink } from '@/lib/native'

export function NativeShareButton({
	shareData,
	className,
}: {
	shareData: { text: string; title: string }
	className?: string
}) {
	const onClick = () => {
		void shareLink(shareData).catch((error: unknown) => {
			if (!isShareCancelled(error)) {
				console.log(`Some error has occurred while sharing.`, error)
				toastError(
					`Some error has occurred while trying to open your device's share screen. Sorry. Please try something else.`
				)
			}
		})
	}

	if (!canShareLink) return null

	return (
		<Button className={className} size="lg" onClick={onClick}>
			<Share />
			Share
		</Button>
	)
}
