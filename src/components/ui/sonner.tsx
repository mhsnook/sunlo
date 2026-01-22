import type { MouseEvent } from 'react'
import { Toaster as Sonner, toast } from 'sonner'
import {
	Copy,
	X,
	CheckCircle,
	Info,
	AlertCircle,
	ArrowUpRight,
} from 'lucide-react'
import { Button } from './button'
import { scrollToMutationButton } from './mutation-button'

// Single Toaster - positions controlled per-toast
export function Toasters() {
	return <Sonner position="top-right" duration={1500} />
}

// Base toast styles
const baseToastClass =
	'flex w-72 items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg'

// Success toast - green, auto-dismiss, top-right
export function toastSuccess(message: string) {
	return toast.custom(
		() => (
			<div
				className={`${baseToastClass} border-green-400/60 bg-green-100/90 text-green-800 dark:border-green-600/60 dark:bg-green-900/40 dark:text-green-200`}
			>
				<CheckCircle className="size-5 shrink-0 text-green-600 dark:text-green-400" />
				<span className="flex-1 text-sm font-medium">{message}</span>
			</div>
		),
		{
			duration: 1500,
			position: 'top-right',
			unstyled: true,
			className: '!bg-transparent !border-0 !shadow-none !p-0',
		}
	)
}

// Info toast - blue, auto-dismiss, top-right
export function toastInfo(message: string) {
	return toast.custom(
		() => (
			<div
				className={`${baseToastClass} border-blue-400/60 bg-blue-100/90 text-blue-800 dark:border-blue-600/60 dark:bg-blue-900/40 dark:text-blue-200`}
			>
				<Info className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
				<span className="flex-1 text-sm font-medium">{message}</span>
			</div>
		),
		{
			duration: 1500,
			position: 'top-right',
			unstyled: true,
			className: '!bg-transparent !border-0 !shadow-none !p-0',
		}
	)
}

// Neutral toast - gray, auto-dismiss, top-right
export function toastNeutral(message: string) {
	return toast.custom(
		() => (
			<div
				className={`${baseToastClass} border-border/60 bg-card/95 text-card-foreground`}
			>
				<span className="flex-1 text-sm font-medium">{message}</span>
			</div>
		),
		{
			duration: 1500,
			position: 'top-right',
			unstyled: true,
			className: '!bg-transparent !border-0 !shadow-none !p-0',
		}
	)
}

// Error toast - red, persists with copy/dismiss, bottom-right
export function toastError(message: string) {
	const copyToClipboard = (e: MouseEvent) => {
		e.stopPropagation()
		void navigator.clipboard
			.writeText(message)
			.then(() => {
				toastSuccess('Copied to clipboard')
			})
			.catch(() => {
				const textarea = document.createElement('textarea')
				textarea.value = message
				document.body.appendChild(textarea)
				textarea.select()
				document.execCommand('copy')
				document.body.removeChild(textarea)
				toastSuccess('Copied to clipboard')
			})
	}

	return toast.custom(
		(t) => (
			<div
				className={`${baseToastClass} w-80 border-red-400/60 bg-red-100/90 text-red-800 dark:border-red-600/60 dark:bg-red-900/40 dark:text-red-200`}
			>
				<AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
				<span className="flex-1 text-sm font-medium">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-red-600 hover:bg-red-200/50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/50 dark:hover:text-red-300"
						onClick={copyToClipboard}
						title="Copy error"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-red-600 hover:bg-red-200/50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/50 dark:hover:text-red-300"
						onClick={() => toast.dismiss(t)}
						title="Dismiss"
					>
						<X className="size-4" />
					</Button>
				</div>
			</div>
		),
		{
			duration: Infinity,
			position: 'bottom-right',
			unstyled: true,
			className: '!bg-transparent !border-0 !shadow-none !p-0',
		}
	)
}

// Mutation error toast - links back to the button that triggered it
export interface MutationErrorOptions {
	/** ID of the mutation button to link back to */
	buttonId?: string
	/** Callback to retry the mutation */
	onRetry?: () => void
}

export function toastMutationError(
	message: string,
	options?: MutationErrorOptions
) {
	const { buttonId, onRetry } = options || {}

	const copyToClipboard = (e: MouseEvent) => {
		e.stopPropagation()
		void navigator.clipboard
			.writeText(message)
			.then(() => {
				toastSuccess('Copied to clipboard')
			})
			.catch(() => {
				const textarea = document.createElement('textarea')
				textarea.value = message
				document.body.appendChild(textarea)
				textarea.select()
				document.execCommand('copy')
				document.body.removeChild(textarea)
				toastSuccess('Copied to clipboard')
			})
	}

	const handleScrollToButton = (e: MouseEvent, toastId: string | number) => {
		e.stopPropagation()
		if (buttonId) {
			scrollToMutationButton(buttonId)
			toast.dismiss(toastId)
		}
	}

	const handleRetry = (e: MouseEvent, toastId: string | number) => {
		e.stopPropagation()
		if (onRetry) {
			toast.dismiss(toastId)
			onRetry()
		}
	}

	return toast.custom(
		(t) => (
			<div
				className={`${baseToastClass} w-80 flex-col items-stretch gap-2 border-red-400/60 bg-red-100/90 text-red-800 dark:border-red-600/60 dark:bg-red-900/40 dark:text-red-200`}
			>
				<div className="flex items-center gap-3">
					<AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
					<span className="flex-1 text-sm font-medium">{message}</span>
				</div>
				<div className="flex items-center justify-between gap-2 border-t border-red-300/40 pt-2 dark:border-red-700/40">
					<div className="flex items-center gap-1">
						{buttonId && (
							<Button
								variant="ghost"
								size="sm"
								className="h-7 gap-1 px-2 text-xs text-red-700 hover:bg-red-200/50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-800/50 dark:hover:text-red-200"
								onClick={(e) => handleScrollToButton(e, t)}
							>
								<ArrowUpRight className="size-3" />
								Go to form
							</Button>
						)}
						{onRetry && (
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs text-red-700 hover:bg-red-200/50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-800/50 dark:hover:text-red-200"
								onClick={(e) => handleRetry(e, t)}
							>
								Retry
							</Button>
						)}
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-7 text-red-600 hover:bg-red-200/50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/50 dark:hover:text-red-300"
							onClick={copyToClipboard}
							title="Copy error"
						>
							<Copy className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-7 text-red-600 hover:bg-red-200/50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/50 dark:hover:text-red-300"
							onClick={() => toast.dismiss(t)}
							title="Dismiss"
						>
							<X className="size-4" />
						</Button>
					</div>
				</div>
			</div>
		),
		{
			duration: Infinity,
			position: 'bottom-right',
			unstyled: true,
			className: '!bg-transparent !border-0 !shadow-none !p-0',
		}
	)
}

// Re-export toast for edge cases, but prefer the named functions above
export { toast }
