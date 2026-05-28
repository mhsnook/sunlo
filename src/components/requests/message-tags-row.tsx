import type { uuid } from '@/types/main'
import { Badge } from '@/components/ui/badge'
import { useMessageTagsForMessage } from '@/features/requests/hooks'

export function MessageTagsRow({ messageId }: { messageId: uuid }) {
	const { data: currentTags } = useMessageTagsForMessage(messageId)

	if (!currentTags?.length) return null

	return (
		<div
			className="flex flex-wrap items-center gap-2"
			data-testid="message-tags-row"
		>
			{currentTags.map((tag) => (
				<Badge
					key={tag.slug}
					variant="outline"
					data-testid="message-tag-chip"
					data-key={tag.slug}
				>
					{tag.label}
				</Badge>
			))}
		</div>
	)
}
