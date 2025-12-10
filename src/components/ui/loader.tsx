import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function IconSizedLoader({ className = '', size = 20 }) {
	return (
		<Loader2 size={size} className={cn(`animate-spin opacity-70`, className)} />
	)
}

export function Loader({ className = '', size = 20 }) {
	return (
		<div
			className={cn(
				'flex h-full w-full items-center justify-center',
				className
			)}
		>
			<IconSizedLoader size={size} />
		</div>
	)
}
