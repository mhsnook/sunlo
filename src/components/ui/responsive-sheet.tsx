/**
 * ResponsiveSheet
 *
 * Bottom drawer on mobile (vaul — swipe-to-dismiss, pull handle).
 * Centered dialog on desktop (@base-ui).
 *
 * Usage:
 *   <ResponsiveSheet open={open} onOpenChange={setOpen} title="...">
 *     <ResponsiveSheetHeader>...</ResponsiveSheetHeader>
 *     <ResponsiveSheetContent>...</ResponsiveSheetContent>
 *   </ResponsiveSheet>
 *
 * The title / description are required for accessibility but can be visually
 * hidden with sr-only inside ResponsiveSheetHeader or via the helpers exported
 * below.
 */
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from '@/components/ui/drawer'

interface ResponsiveSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Required for accessibility. Render visibly inside ResponsiveSheetHeader
	 *  or pass className="sr-only" via ResponsiveSheetTitle. */
	title: string
	description?: string
	className?: string
	children?: ReactNode
}

/**
 * Root. Renders a bottom Drawer on mobile, a centered Dialog on desktop.
 * No built-in close button — put one in your ResponsiveSheetHeader so it
 * appears consistently in both contexts.
 */
export function ResponsiveSheet({
	open,
	onOpenChange,
	title,
	description,
	className,
	children,
}: ResponsiveSheetProps) {
	const isMobile = useIsMobile()

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent
					className={cn('flex flex-col gap-0 overflow-hidden p-0', className)}
				>
					<DrawerTitle className="sr-only">{title}</DrawerTitle>
					{description && (
						<DrawerDescription className="sr-only">
							{description}
						</DrawerDescription>
					)}
					{children}
				</DrawerContent>
			</Drawer>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				hideClose
				className={cn(
					'flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0',
					className
				)}
			>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				{description && (
					<DialogDescription className="sr-only">
						{description}
					</DialogDescription>
				)}
				{children}
			</DialogContent>
		</Dialog>
	)
}

/**
 * Header bar — a horizontal flex row with a bottom border.
 * Typically contains a title or action on the left and a close (×) button on
 * the right. On desktop the dialog is centered so there's no ambient "back"
 * affordance; the close button here is the only dismiss target besides
 * clicking the backdrop or pressing Escape.
 */
export function ResponsiveSheetHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-between border-b px-4 py-3',
				className
			)}
			{...props}
		/>
	)
}

/**
 * Scrollable content area. Fills the remaining height of the sheet.
 */
export function ResponsiveSheetBody({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('min-h-0 flex-1 overflow-y-auto', className)}
			{...props}
		/>
	)
}
