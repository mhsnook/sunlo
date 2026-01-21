import { Toaster as Sonner, toast } from 'sonner'
import { Copy, X } from 'lucide-react'
import { Button } from './button'

// Single Toaster - default position top-right, only errors go bottom-right
export function Toasters() {
	return (
		<Sonner
			position="top-right"
			duration={1500}
			toastOptions={{
				classNames: {
					toast:
						'bg-card/95 border border-border/60 text-card-foreground shadow-lg rounded-2xl px-4 py-3 gap-3',
					title: 'text-foreground font-medium',
					description: 'text-muted-foreground text-sm',
					success:
						'border-green-400/60 dark:border-green-600/60 text-green-800 dark:text-green-200 [&_[data-icon]]:text-green-600 dark:[&_[data-icon]]:text-green-400',
					info: 'border-blue-400/60 dark:border-blue-600/60 text-blue-800 dark:text-blue-200 [&_[data-icon]]:text-blue-600 dark:[&_[data-icon]]:text-blue-400',
					error:
						'border-red-400/60 dark:border-red-600/60 text-red-800 dark:text-red-200 [&_[data-icon]]:text-red-600 dark:[&_[data-icon]]:text-red-400',
				},
			}}
		/>
	)
}

// Custom error toast with copy and dismiss icon buttons - persists, stacks bottom-right
export function toastError(message: string) {
	const copyToClipboard = async (e: React.MouseEvent) => {
		e.stopPropagation()
		try {
			await navigator.clipboard.writeText(message)
			toast.success('Copied to clipboard')
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement('textarea')
			textarea.value = message
			document.body.appendChild(textarea)
			textarea.select()
			document.execCommand('copy')
			document.body.removeChild(textarea)
			toast.success('Copied to clipboard')
		}
	}

	return toast.custom(
		(t) => (
			<div className="flex w-80 items-center gap-3 rounded-2xl border border-red-300/60 bg-red-100/90 px-4 py-3 text-red-800 shadow-lg dark:border-red-700/60 dark:bg-red-900/40 dark:text-red-200">
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

// Success toast helper - auto-dismiss, top-right (uses defaults)
export function toastSuccess(message: string) {
	return toast.success(message)
}

// Re-export toast for other use cases (custom icons, neutral toasts, etc.)
// These will use the default top-right position and 1.5s duration
export { toast }
