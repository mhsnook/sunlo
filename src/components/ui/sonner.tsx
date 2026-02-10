import type { MouseEvent } from 'react'
import { Toaster as Sonner, toast } from 'sonner'
import { Copy, X, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { Button } from './button'

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
				data-testid="toast-success"
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
				data-testid="toast-neutral"
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
	const copyToClipboard = async (e: MouseEvent): Promise<void> => {
		e.stopPropagation()
		try {
			await navigator.clipboard.writeText(message)
			toastSuccess('Copied to clipboard')
		} catch {
			const textarea = document.createElement('textarea')
			textarea.value = message
			document.body.appendChild(textarea)
			textarea.select()
			document.execCommand('copy')
			document.body.removeChild(textarea)
			toastSuccess('Copied to clipboard')
		}
	}

	return toast.custom(
		(t) => (
			<div
				data-testid="toast-error"
				className={`${baseToastClass} w-80 border-red-400/60 bg-red-100/90 text-red-800 dark:border-red-600/60 dark:bg-red-900/40 dark:text-red-200`}
			>
				<AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
				<span className="flex-1 text-sm font-medium">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-red-600 hover:bg-red-200/50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/50 dark:hover:text-red-300"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard}
						aria-label="Copy error"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-red-600 hover:bg-red-200/50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/50 dark:hover:text-red-300"
						onClick={() => toast.dismiss(t)}
						aria-label="Dismiss"
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

// Re-export toast for edge cases, but prefer the named functions above
export { toast }
