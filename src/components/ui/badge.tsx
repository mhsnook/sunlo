import { cn } from '@/lib/utils'
import { BadgeProps, badgeVariants } from './badge-variants'
import { OctagonMinus } from 'lucide-react'

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span className={cn(badgeVariants({ variant }), className)} {...props} />
	)
}

const OctogonMinusDangerBadge = (
	<Badge variant="destructive" className="p-2">
		<OctagonMinus />
	</Badge>
)

export { Badge, OctogonMinusDangerBadge }
