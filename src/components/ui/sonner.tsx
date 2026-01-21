import { Toaster as Sonner, toast } from 'sonner'
import { Copy, X } from 'lucide-react'

// Single Toaster - default position top-right, only errors go bottom-right
export function Toasters() {
	return (
		<Sonner
			position="top-right"
			duration={1500}
			toastOptions={{
				classNames: {
					toast:
						'bg-card border border-border text-card-foreground shadow-lg rounded-2xl p-4 gap-3',
					title: 'text-foreground font-medium',
					description: 'text-muted-foreground text-sm',
					success:
						'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 [&_[data-icon]]:text-green-600 dark:[&_[data-icon]]:text-green-400',
					info: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 [&_[data-icon]]:text-blue-600 dark:[&_[data-icon]]:text-blue-400',
					error:
						'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 [&_[data-icon]]:text-red-600 dark:[&_[data-icon]]:text-red-400',
					actionButton:
						'bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-3 py-1.5 text-sm font-medium',
					cancelButton:
						'bg-muted hover:bg-muted/80 rounded-xl px-2 py-1.5 text-muted-foreground',
				},
			}}
		/>
	)
}

// Custom error toast with copy and dismiss buttons - persists, stacks bottom-right
export function toastError(message: string) {
	const copyToClipboard = async () => {
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

	return toast.error(message, {
		duration: Infinity,
		position: 'bottom-right',
		action: {
			label: (
				<span className="flex items-center gap-1.5 font-medium">
					<Copy className="size-3.5" />
					Copy
				</span>
			) as unknown as string,
			onClick: copyToClipboard,
		},
		cancel: {
			label: (
				<span className="flex items-center">
					<X className="size-4" />
				</span>
			) as unknown as string,
			onClick: () => {},
		},
	})
}

// Success toast helper - auto-dismiss, top-right (uses defaults)
export function toastSuccess(message: string) {
	return toast.success(message)
}

// Re-export toast for other use cases (custom icons, neutral toasts, etc.)
// These will use the default top-right position and 1.5s duration
export { toast }
