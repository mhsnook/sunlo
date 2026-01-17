import { ReactNode, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { useAuth } from '@/lib/use-auth'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { buttonVariants } from '@/components/ui/button'

interface AuthenticatedDialogProps {
	children: ReactNode
	trigger: ReactNode
	/** Title shown when prompting to log in */
	authTitle?: string
	/** Message explaining why login is needed */
	authMessage?: string
	/** Control open state externally */
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

/**
 * A dialog wrapper that shows login prompt when user is not authenticated.
 * When authenticated, renders children normally.
 */
export function AuthenticatedDialog({
	children,
	trigger,
	authTitle = 'Login Required',
	authMessage = 'Please log in to continue.',
	open: controlledOpen,
	onOpenChange,
}: AuthenticatedDialogProps) {
	const { isAuth } = useAuth()
	const [internalOpen, setInternalOpen] = useState(false)

	const open = controlledOpen ?? internalOpen
	const setOpen = onOpenChange ?? setInternalOpen

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			{isAuth ?
				children
			:	<DialogContent className="sm:max-w-106">
					<DialogHeader>
						<DialogTitle>{authTitle}</DialogTitle>
						<DialogDescription>{authMessage}</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<p className="text-muted-foreground text-sm">
							Create an account to join the community and contribute to the
							language learning content.
						</p>
						<div className="flex flex-row justify-between gap-4">
							<Link
								to="/login"
								search={{ redirectedFrom: window.location.href }}
								className={buttonVariants({ variant: 'default' })}
							>
								Log in
							</Link>
							<Link
								to="/signup"
								className={buttonVariants({ variant: 'secondary' })}
							>
								Create account
							</Link>
						</div>
					</div>
				</DialogContent>
			}
		</Dialog>
	)
}

interface AuthenticatedDialogContentProps {
	children: ReactNode
	/** Title shown when prompting to log in */
	authTitle?: string
	/** Message explaining why login is needed */
	authMessage?: string
	/** Class name for the DialogContent when authenticated */
	className?: string
}

/**
 * DialogContent that shows login prompt when user is not authenticated.
 * Use this when you need more control over the Dialog wrapper.
 * Wraps children in DialogContent when authenticated.
 */
export function AuthenticatedDialogContent({
	children,
	authTitle = 'Login Required',
	authMessage = 'Please log in to continue.',
	className,
}: AuthenticatedDialogContentProps) {
	const { isAuth } = useAuth()

	if (isAuth) {
		return <DialogContent className={className}>{children}</DialogContent>
	}

	return (
		<DialogContent className="sm:max-w-106">
			<DialogHeader>
				<DialogTitle>{authTitle}</DialogTitle>
				<DialogDescription>{authMessage}</DialogDescription>
			</DialogHeader>
			<div className="flex flex-col gap-4">
				<p className="text-muted-foreground text-sm">
					Create an account to join the community and contribute to the language
					learning content.
				</p>
				<div className="flex flex-row justify-between gap-4">
					<Link
						to="/login"
						search={{ redirectedFrom: window.location.href }}
						className={buttonVariants({ variant: 'default' })}
					>
						Log in
					</Link>
					<Link
						to="/signup"
						className={buttonVariants({ variant: 'secondary' })}
					>
						Create account
					</Link>
				</div>
			</div>
		</DialogContent>
	)
}
