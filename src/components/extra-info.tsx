import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Ellipsis } from 'lucide-react'
import { ReactNode } from '@tanstack/react-router'

export default function ExtraInfo({
	title,
	description,
	className,
	children,
}: {
	title?: string
	description?: string
	children: ReactNode
	className?: string
}) {
	return (
		<Dialog>
			<DialogTrigger className={className} asChild>
				<Button variant="ghost" size="icon">
					<Ellipsis className="size-4" />
					<span className="sr-only">Show more</span>
				</Button>
			</DialogTrigger>

			<DialogContent className="w-app max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	)
}
