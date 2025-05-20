import toast from 'react-hot-toast'
import { Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NativeShareButton({
	shareData,
}: {
	shareData: { text: string; title: string }
}) {
	const canShare = typeof navigator?.share === 'function'
	if (!canShare) return null

	const onClick = () => {
		void navigator.share(shareData).catch((error: DOMException | TypeError) => {
			console.log(
				`Some error has occurred while sharing. It could just be they cancelled the share.`,
				error
			)
			toast.error(
				`Some error has occurred while trying to open your device's share screen 🙈 Sorry. Please try something else.`
			)
		})
	}

	return (
		<Button size="lg" onClick={onClick}>
			Share <Share />
		</Button>
	)
}
