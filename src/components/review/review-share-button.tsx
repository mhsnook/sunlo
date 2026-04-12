import { Share2 } from 'lucide-react'
import { toastSuccess } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { useReviewsToday } from '@/features/review/hooks'
import { toManifestEntry } from '@/features/review/manifest'
import { useLanguageMeta } from '@/features/languages'

interface ReviewShareButtonProps {
	lang: string
	dayString: string
}

export function ReviewShareButton({ lang, dayString }: ReviewShareButtonProps) {
	const { data } = useReviewsToday(lang, dayString)
	const { data: langMeta } = useLanguageMeta(lang)

	const manifest = data?.manifest ?? []
	const reviews = data?.reviews ?? []

	// Manifest entries are "phrase_id:direction" strings, so the lookup key must
	// match — keying by phrase_id alone would never hit.
	const firstTryMap = new Map(
		reviews
			.filter((r) => r.day_first_review === true)
			.map((r) => [toManifestEntry(r.phrase_id, r.direction), r])
	)

	const emojis = manifest.map((entry) => {
		const review = firstTryMap.get(entry)
		if (!review) return '⬛'
		if (review.score === 1) return '🟨'
		return '🟩'
	})

	const rowSize = emojis.length > 40 ? 10 : 5
	const rows: Array<string> = []
	for (let i = 0; i < emojis.length; i += rowSize) {
		rows.push(emojis.slice(i, i + rowSize).join(''))
	}

	const correct = emojis.filter((e) => e === '🟩').length
	const total = emojis.length
	const langName = langMeta?.name ?? lang

	const handleShare = () => {
		const text = [
			`Sunlo review • ${langName} • ${dayString}`,
			'',
			...rows,
			'',
			`${correct}/${total} recalled • ${Math.round((correct / total) * 100)}%`,
		].join('\n')

		void navigator.clipboard.writeText(text).then(() => {
			toastSuccess('Copied to clipboard!')
		})
	}

	if (manifest.length === 0) return null

	return (
		<Button variant="soft" size="lg" onClick={handleShare} className="w-full">
			<Share2 className="me-2 h-4 w-4" />
			Share results
		</Button>
	)
}
