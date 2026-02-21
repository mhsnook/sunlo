import type { MouseEvent } from 'react'
import { Toaster as Sonner, toast } from 'sonner'
import { Copy, X, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { Button } from './button'

// Single Toaster - all toasts bottom-right
export function Toasters() {
	return <Sonner position="bottom-right" duration={1500} />
}

// Ephemeral toast styles (auto-dismiss, variable width)
const ephemeralClass =
	'flex w-fit items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg'
// Persistent toast styles (fixed width, dismiss/copy actions)
const persistentClass =
	'flex w-80 items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg'
const toastWrapper = '!bg-transparent !border-0 !shadow-none !p-0'

function copyToClipboard(message: string) {
	return async (e: MouseEvent): Promise<void> => {
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
}

// Success toast - green, ephemeral
export function toastSuccess(message: string) {
	return toast.custom(
		() => (
			<div
				data-testid="toast-success"
				className={`${ephemeralClass} border-4-mid-success bg-1-mlo-success text-8-mid-success`}
			>
				<CheckCircle className="text-6-mhi-success size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
			</div>
		),
		{
			duration: 1500,
			unstyled: true,
			className: toastWrapper,
		}
	)
}

// Neutral toast - card colors, ephemeral, optional emoji icon
export function toastNeutral(message: string, options?: { icon?: string }) {
	return toast.custom(
		() => (
			<div
				data-testid="toast-neutral"
				className={`${ephemeralClass} border-border/60 bg-card/95 text-card-foreground`}
			>
				{options?.icon && (
					<span className="shrink-0 text-lg">{options.icon}</span>
				)}
				<span className="flex-1 text-sm">{message}</span>
			</div>
		),
		{
			duration: 1500,
			unstyled: true,
			className: toastWrapper,
		}
	)
}

// Info toast - blue, persistent with copy/dismiss
export function toastInfo(message: string) {
	return toast.custom(
		(t) => (
			<div
				data-testid="toast-info"
				className={`${persistentClass} border-4-mid-info bg-1-mlo-info text-8-mid-info`}
			>
				<Info className="text-lc-6 text-c-mhi text-h-info size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="text-6-mhi-info hover:bg-2-mlo-info size-7"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard(message)}
						aria-label="Copy message"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-6-mhi-info hover:bg-2-mlo-info size-7"
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
			unstyled: true,
			className: toastWrapper,
		}
	)
}

// Error toast - red, persistent with copy/dismiss
export function toastError(message: string) {
	return toast.custom(
		(t) => (
			<div
				data-testid="toast-error"
				className={`${persistentClass} border-4-mid-danger bg-1-mlo-danger text-8-mid-danger`}
			>
				<AlertCircle className="text-lc-6 text-c-mhi text-h-danger size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="text-6-mhi-danger hover:bg-2-mlo-danger size-7"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard(message)}
						aria-label="Copy error"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-6-mhi-danger hover:bg-2-mlo-danger size-7"
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
			unstyled: true,
			className: toastWrapper,
		}
	)
}

// Re-export toast for edge cases, but prefer the named functions above
export { toast }
