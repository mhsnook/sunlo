import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function Loader({ className = '', size = 20 }) {
	return (
		<div className={cn('flex h-full w-full items-center', className)}>
			<Loader2 size={size} className="mx-auto animate-spin opacity-70" />
		</div>
	)
}
