import type { ReactNode } from 'react'
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

export default function ExtraInfo({
	title,
	description,
	className,
	children,
	link,
}: {
	title?: string
	description?: string
	children: ReactNode
	className?: string
	link?: boolean
}) {
	return (
		<Dialog>
			<DialogTrigger className={className} asChild={!link}>
				{link ?
					<span className="inline-flex w-full cursor-pointer items-center gap-2">
						<Ellipsis className="size-4" />
						Show details
					</span>
				:	<Button variant="ghost" size="icon">
						<Ellipsis className="size-4" />
						<span className="sr-only">Show more</span>
					</Button>
				}
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
