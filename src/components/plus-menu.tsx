import {
	ListMusic,
	MessageCircleHeart,
	MessageSquareQuote,
	PlusIcon,
} from 'lucide-react'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Link } from '@tanstack/react-router'

export function PlusMenu({ lang }: { lang: string }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
				<PlusIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					render={
						<Link
							to="/learn/$lang/requests/new"
							params={{ lang }}
							data-testid="new-request-link"
						/>
					}
				>
					<MessageCircleHeart className="size-4" />
					<span>New Request</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					render={<Link to="/learn/$lang/phrases/new" params={{ lang }} />}
				>
					<MessageSquareQuote className="size-4" />
					<span>New Phrase</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					render={<Link to="/learn/$lang/playlists/new" params={{ lang }} />}
				>
					<ListMusic className="size-4" />
					<span>New Playlist</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
