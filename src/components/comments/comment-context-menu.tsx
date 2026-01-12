import toast from 'react-hot-toast'
import { Share, Link as LinkIcon, Flag, MoreVertical } from 'lucide-react'

import type { RequestCommentType } from '@/lib/schemas'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import Flagged from '../flagged'

interface CommentContextMenuProps {
	comment: RequestCommentType
	lang: string
}

export function CommentContextMenu({ comment, lang }: CommentContextMenuProps) {
	const commentUrl = `${window.location.origin}/learn/${lang}/requests/${comment.request_id}?showSubthread=${comment.parent_comment_id ?? comment.id}${comment.parent_comment_id ? `&highlightComment=${comment.id}` : ''}`

	const handleShare = () => {
		if (!navigator.share) {
			toast.error('Sharing is not supported on this device')
			return
		}

		navigator
			.share({
				title: 'Sunlo Comment',
				text: `Check out this comment${comment.content ? `: ${comment.content.slice(0, 100)}${comment.content.length > 100 ? '...' : ''}` : ''}`,
				url: commentUrl,
			})
			.catch(() => {
				toast.error('Failed to share')
			})
	}

	const handleCopyPermalink = () => {
		navigator.clipboard
			.writeText(commentUrl)
			.then(() => {
				toast.success('Link copied to clipboard')
			})
			.catch(() => {
				toast.error('Failed to copy link')
			})
	}

	const handleReport = () => {
		// Placeholder for report functionality
		toast.success(
			'Thank you for reporting. We will review this comment shortly.'
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					title="More options"
					data-testid="comment-context-menu-trigger"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{typeof navigator !== 'undefined' && 'share' in navigator && (
					<DropdownMenuItem onClick={handleShare}>
						<Share className="mr-2 h-4 w-4" />
						<span>Share</span>
					</DropdownMenuItem>
				)}
				<DropdownMenuItem onClick={handleCopyPermalink}>
					<LinkIcon className="mr-2 h-4 w-4" />
					<span>Copy link</span>
				</DropdownMenuItem>
				<Flagged>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleReport}>
						<Flag className="mr-2 h-4 w-4" />
						<span>Report</span>
					</DropdownMenuItem>
				</Flagged>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
