import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function Loader({ className = '' }) {
	return (
		<div className={cn('flex h-full w-full items-center', className)}>
			<Loader2 className="mx-auto size-4 animate-spin opacity-70" />
		</div>
	)
}
