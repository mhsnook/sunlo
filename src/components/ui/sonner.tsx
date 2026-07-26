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
				className={`${ephemeralClass} border-con-mlow border-hue-success bg-lum-2 bg-chroma-mlow bg-hue-success text-con-mhigh text-hue-success`}
			>
				<CheckCircle className="hue-success text-con-mhigh text-chroma-mhigh size-5 shrink-0" />
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
				className={`${ephemeralClass} border-con-low bg-card/95 text-con-mhigh`}
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
				className={`${persistentClass} border-con-mlow border-hue-info bg-lum-2 bg-chroma-mlow bg-hue-info text-con-mhigh text-hue-info`}
			>
				<Info className="hue-info text-con-mhigh text-chroma-mhigh size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="hue-info hover:hue-info text-con-mhigh text-chroma-mhigh hover:bg-lum-3 hover:bg-chroma-mlow size-7"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard(message)}
						aria-label="Copy message"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="hue-info hover:hue-info text-con-mhigh text-chroma-mhigh hover:bg-lum-3 hover:bg-chroma-mlow size-7"
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
				className={`${persistentClass} border-con-mlow border-hue-danger bg-lum-2 bg-chroma-mlow bg-hue-danger text-con-mhigh text-hue-danger`}
			>
				<AlertCircle className="hue-danger text-con-mhigh text-chroma-mhigh size-5 shrink-0" />
				<span className="flex-1 text-sm">{message}</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="hue-danger hover:hue-danger text-con-mhigh text-chroma-mhigh hover:bg-lum-3 hover:bg-chroma-mlow size-7"
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onClick={copyToClipboard(message)}
						aria-label="Copy error"
					>
						<Copy className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="hue-danger hover:hue-danger text-con-mhigh text-chroma-mhigh hover:bg-lum-3 hover:bg-chroma-mlow size-7"
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
