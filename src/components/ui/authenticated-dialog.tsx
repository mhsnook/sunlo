import { ComponentPropsWithoutRef, ReactNode, useState } from 'react'
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

/** The Log-in / Create-account button pair shown on any auth-gated surface. */
export function LoginSignupButtons() {
	return (
		<div className="flex flex-row justify-between gap-4">
			<Link
				to="/login"
				search={{ redirectedFrom: window.location.href }}
				className={buttonVariants({ variant: 'default' })}
			>
				Log in
			</Link>
			<Link to="/signup" className={buttonVariants({ variant: 'neutral' })}>
				Create account
			</Link>
		</div>
	)
}

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
	/** Let an anonymous user through: only for their own data, never public content */
	allowAnonymous?: boolean
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
	allowAnonymous = false,
}: AuthenticatedDialogProps) {
	const { isAuth, hasAccount } = useAuth()
	const allowed = allowAnonymous ? isAuth : hasAccount
	const [internalOpen, setInternalOpen] = useState(false)

	const open = controlledOpen ?? internalOpen
	const setOpen = onOpenChange ?? setInternalOpen

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			{allowed ? (
				children
			) : (
				<DialogContent className="sm:max-w-106">
					<DialogHeader>
						<DialogTitle>{authTitle}</DialogTitle>
						<DialogDescription>{authMessage}</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<p className="text-muted-foreground text-sm">
							Create an account to join the community and contribute to the
							language learning content.
						</p>
						<LoginSignupButtons />
					</div>
				</DialogContent>
			)}
		</Dialog>
	)
}

interface AuthenticatedDialogContentProps extends ComponentPropsWithoutRef<
	typeof DialogContent
> {
	/** Title shown when prompting to log in */
	authTitle?: string
	/** Message explaining why login is needed */
	authMessage?: string
	/** Let an anonymous user through: only for their own data, never public content */
	allowAnonymous?: boolean
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
	allowAnonymous = false,
	...rest
}: AuthenticatedDialogContentProps) {
	const { isAuth, hasAccount } = useAuth()

	if (allowAnonymous ? isAuth : hasAccount) {
		return <DialogContent {...rest}>{children}</DialogContent>
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
					<Link to="/signup" className={buttonVariants({ variant: 'neutral' })}>
						Create account
					</Link>
				</div>
			</div>
		</DialogContent>
	)
}
