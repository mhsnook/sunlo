import { Toaster as Sonner, toast } from 'sonner'
import { Copy, X } from 'lucide-react'

// Single Toaster component - positions are controlled per-toast
export function Toasters() {
	return (
		<Sonner
			toastOptions={{
				classNames: {
					toast:
						'bg-card border-border text-card-foreground shadow-lg rounded-xl',
					success: 'border-l-4 border-l-green-500',
					info: 'border-l-4 border-l-blue-500',
					error:
						'bg-destructive/10 border border-destructive text-foreground border-l-4 border-l-destructive',
					actionButton:
						'bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-sm font-medium',
					cancelButton:
						'bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg px-2 py-1.5',
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
			toast.success('Copied to clipboard', {
				position: 'top-right',
				duration: 1500,
			})
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement('textarea')
			textarea.value = message
			document.body.appendChild(textarea)
			textarea.select()
			document.execCommand('copy')
			document.body.removeChild(textarea)
			toast.success('Copied to clipboard', {
				position: 'top-right',
				duration: 1500,
			})
		}
	}

	return toast.error(message, {
		duration: Infinity,
		position: 'bottom-right',
		action: {
			label: (
				<span className="flex items-center gap-1">
					<Copy className="size-3" />
					Copy
				</span>
			) as unknown as string,
			onClick: copyToClipboard,
		},
		cancel: {
			label: (
				<span className="flex items-center gap-1">
					<X className="size-3" />
				</span>
			) as unknown as string,
			onClick: () => {},
		},
	})
}

// Success toast helper - auto-dismiss, top-right
export function toastSuccess(message: string) {
	return toast.success(message, {
		position: 'top-right',
		duration: 1500,
	})
}

// Re-export toast for other use cases (custom icons, neutral toasts, etc.)
export { toast }
