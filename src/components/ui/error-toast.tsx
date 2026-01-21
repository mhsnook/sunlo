import toast from 'react-hot-toast'
import { Copy, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorToastProps {
	id: string
	visible: boolean
	message: string
}

function ErrorToast({ id, visible, message }: ErrorToastProps) {
	const copyError = () => {
		navigator.clipboard
			.writeText(message)
			.then(() => {
				toast.success('Error copied to clipboard')
			})
			.catch(() => {
				// silently fail
			})
	}

	return (
		<div
			className={cn(
				'pointer-events-auto flex w-full max-w-md flex-row items-stretch overflow-hidden rounded-2xl bg-red-100 text-red-900 shadow-lg ring-1 ring-red-300 dark:bg-red-950 dark:text-red-100 dark:ring-red-800',
				visible ?
					'animate-in fade-in slide-in-from-top-2'
				:	'animate-out fade-out slide-out-to-top-2'
			)}
		>
			<div className="flex flex-1 flex-col gap-1 p-4">
				<p className="text-sm font-medium">Error</p>
				<p className="text-sm opacity-90">{message}</p>
			</div>
			<div className="flex flex-col border-s border-red-300 dark:border-red-800">
				<button
					onClick={copyError}
					className="flex flex-1 items-center justify-center px-3 transition-colors hover:bg-red-200 dark:hover:bg-red-900"
					title="Copy error message"
				>
					<Copy className="h-4 w-4" />
				</button>
				<button
					onClick={() => toast.dismiss(id)}
					className="flex flex-1 items-center justify-center border-t border-red-300 px-3 transition-colors hover:bg-red-200 dark:border-red-800 dark:hover:bg-red-900"
					title="Dismiss"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	)
}

export function toastError(message: string) {
	return toast.custom(
		(t) => <ErrorToast id={t.id} visible={t.visible} message={message} />,
		{ duration: Infinity }
	)
}
