import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'

interface InfoDialogProps {
	title: string
	description?: string
	children: ReactNode
}

/**
 * A small info icon button that opens a responsive dialog (desktop) / drawer (mobile)
 * with contextual help text.
 */
export function InfoDialog({ title, description, children }: InfoDialogProps) {
	const [open, setOpen] = useState(false)
	const isMobile = useIsMobile()

	const trigger = (
		<button
			onClick={() => setOpen(true)}
			className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center rounded-full p-1 transition-colors"
			aria-label={`More info about ${title}`}
		>
			<Info className="size-4" />
		</button>
	)

	if (isMobile) {
		return (
			<>
				{trigger}
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerContent>
						<DrawerHeader className="px-6 text-left">
							<DrawerTitle className="text-[2rem] leading-tight">
								{title}
							</DrawerTitle>
							{description && (
								<DrawerDescription className="text-base">
									{description}
								</DrawerDescription>
							)}
						</DrawerHeader>
						<div className="space-y-4 px-6 pb-6 text-[1.4rem] leading-relaxed">
							{children}
						</div>
						<DrawerFooter className="px-6 pt-4 pb-8">
							<DrawerClose asChild>
								<Button size="lg" className="w-full">
									Got it
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			</>
		)
	}

	return (
		<>
			{trigger}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-2xl">{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					<div className="space-y-4 py-2 text-base leading-relaxed">
						{children}
					</div>
					<DialogFooter>
						<Button size="lg" onClick={() => setOpen(false)}>
							Got it
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
