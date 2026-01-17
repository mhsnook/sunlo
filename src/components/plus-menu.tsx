import {
	Disc3,
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
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<PlusIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<Link
						to="/learn/$lang/requests/new"
						params={{ lang }}
						className="flex w-full items-center gap-2"
					>
						<MessageCircleHeart className="size-4" />
						<span>New Request</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						to="/learn/$lang/phrases/new"
						params={{ lang }}
						className="flex w-full items-center gap-2"
					>
						<MessageSquareQuote className="size-4" />
						<span>New Phrase</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						to="/learn/$lang/playlists/new"
						params={{ lang }}
						className="flex w-full items-center gap-2"
					>
						<Disc3 className="size-4" />
						<span>New Playlist</span>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
