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
	DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from './ui/button-variants'

const buttonOutline = buttonVariants({ variant: 'outline' })

export function PlusMenu({ lang }: { lang: string }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<PlusIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="z-30 flex flex-col gap-2 rounded bg-black/10 p-3 backdrop-blur-sm">
				<Link
					to="/learn/$lang/requests/new"
					params={{ lang }}
					className={buttonOutline}
				>
					<MessageCircleHeart className="size-3" />
					<span className="me-1">New Request</span>
				</Link>
				<Link
					to="/learn/$lang/add-phrase"
					params={{ lang }}
					className={buttonOutline}
				>
					<MessageSquareQuote className="size-3" />
					<span className="me-1">New Phrase</span>
				</Link>
				<Link
					to="/learn/$lang/playlists/new"
					params={{ lang }}
					className={buttonOutline}
				>
					<Disc3 className="size-3" />
					<span className="me-1">New Playlist</span>
				</Link>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
