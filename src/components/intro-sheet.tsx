import * as React from 'react'
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

interface IntroSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	children: React.ReactNode
	/** If true, user must click the action button to close (no X, no outside click) */
	requireAffirmation?: boolean
	/** Text for the primary action button */
	actionLabel?: string
	/** Called when user clicks the action button */
	onAction?: () => void
	/** Text for secondary/skip button (only shown if not requireAffirmation) */
	skipLabel?: string
	/** Called when user clicks skip */
	onSkip?: () => void
	/** data-testid for the action button */
	actionTestId?: string
}

/**
 * A responsive intro/training sheet.
 * Shows as a drawer on mobile, dialog on desktop.
 * Supports both "headsup" mode (dismissible) and "affirmation" mode (must confirm).
 */
export function IntroSheet({
	open,
	onOpenChange,
	title,
	description,
	children,
	requireAffirmation = false,
	actionLabel = 'Got it',
	onAction,
	skipLabel,
	onSkip,
	actionTestId,
}: IntroSheetProps) {
	const isMobile = useIsMobile()

	const handleAction = () => {
		onAction?.()
		onOpenChange(false)
	}

	const handleSkip = () => {
		onSkip?.()
		onOpenChange(false)
	}

	// Prevent closing if affirmation is required
	const handleOpenChange = (newOpen: boolean) => {
		if (requireAffirmation && !newOpen) {
			// Don't allow closing without action
			return
		}
		onOpenChange(newOpen)
	}

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={handleOpenChange}>
				<DrawerContent data-testid="intro-message-section">
					<DrawerHeader className="text-left">
						<DrawerTitle>{title}</DrawerTitle>
						{description && (
							<DrawerDescription>{description}</DrawerDescription>
						)}
					</DrawerHeader>
					<div className="space-y-4 overflow-y-auto px-4 pb-4">{children}</div>
					<DrawerFooter className="pt-2">
						<Button
							onClick={handleAction}
							className="w-full"
							data-testid={actionTestId}
						>
							{actionLabel}
						</Button>
						{!requireAffirmation && skipLabel && (
							<DrawerClose asChild>
								<Button
									variant="outline"
									onClick={handleSkip}
									className="w-full"
								>
									{skipLabel}
								</Button>
							</DrawerClose>
						)}
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				data-testid="intro-message-section"
				className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
				onInteractOutside={
					requireAffirmation ? (e) => e.preventDefault() : undefined
				}
				onEscapeKeyDown={
					requireAffirmation ? (e) => e.preventDefault() : undefined
				}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<div className="space-y-4 py-4">{children}</div>
				<DialogFooter className="gap-2 sm:gap-0">
					{!requireAffirmation && skipLabel && (
						<Button variant="outline" onClick={handleSkip}>
							{skipLabel}
						</Button>
					)}
					<Button onClick={handleAction} data-testid={actionTestId}>
						{actionLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
