import toast from 'react-hot-toast'
import { Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback } from 'react'

export function NativeShareButton({
	shareData,
}: {
	shareData: { text: string; title: string }
}) {
	const canShare = typeof navigator?.share === 'function'

	const onClick = useCallback(() => {
		void navigator.share(shareData).catch((error: DOMException | TypeError) => {
			if (error.name !== 'AbortError') {
				console.log(`Some error has occurred while sharing.`, error)
				toast.error(
					`Some error has occurred while trying to open your device's share screen 🙈 Sorry. Please try something else.`
				)
			}
		})
	}, [shareData])

	if (!canShare) return null

	return (
		<Button size="lg" onClick={onClick}>
			Share <Share />
		</Button>
	)
}
