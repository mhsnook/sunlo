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
				className={`${ephemeralClass} border-lc-4 border-chroma-mid border-hue-success bg-lc-1 bg-chroma-mlo bg-hue-success text-lc-8 text-chroma-mid text-hue-success`}
			>
				<CheckCircle className="text-lc-6 text-chroma-mhi text-hue-success size-5 shrink-0" />
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
				className={`${persistentClass} border-lc-4 border-chroma-mid border-hue-info bg-lc-1 bg-chroma-mlo bg-hue-info text-lc-8 text-chroma-mid text-hue-info`}
			>
				<Info className="text-lc-6 text-chroma-mhi text-hue-info size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="text-lc-6 text-chroma-mhi text-hue-info hover:bg-lc-2 hover:bg-chroma-mlo hover:bg-hue-info size-7"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard(message)}
						aria-label="Copy message"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-lc-6 text-chroma-mhi text-hue-info hover:bg-lc-2 hover:bg-chroma-mlo hover:bg-hue-info size-7"
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
				className={`${persistentClass} border-lc-4 border-chroma-mid border-hue-danger bg-lc-1 bg-chroma-mlo bg-hue-danger text-lc-8 text-chroma-mid text-hue-danger`}
			>
				<AlertCircle className="text-lc-6 text-chroma-mhi text-hue-danger size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="text-lc-6 text-chroma-mhi text-hue-danger hover:bg-lc-2 hover:bg-chroma-mlo hover:bg-hue-danger size-7"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard(message)}
						aria-label="Copy error"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-lc-6 text-chroma-mhi text-hue-danger hover:bg-lc-2 hover:bg-chroma-mlo hover:bg-hue-danger size-7"
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
