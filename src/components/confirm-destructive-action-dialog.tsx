import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { ReactNode } from '@tanstack/react-router'

export function ConfirmDestructiveActionDialog({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: Array<ReactNode>
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>{children[0]}</DialogTrigger>
			<DialogContent className="@xl:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2">
					<DialogClose asChild>
						<Button variant="secondary">Go back</Button>
					</DialogClose>
					{children[1]}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
