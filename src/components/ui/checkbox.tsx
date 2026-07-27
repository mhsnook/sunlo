import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const Checkbox = ({ className, ...props }: CheckboxPrimitive.Root.Props) => (
	<CheckboxPrimitive.Root
		data-slot="checkbox"
		className={cn(
			'peer border-lum-4 border-chroma-max focus-visible:outline-con-high data-[checked]:bg-lum-5 data-[checked]:bg-chroma-max data-[checked]:text-con-high size-4 shrink-0 rounded border focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator
			className={cn('flex items-center justify-center text-current')}
		>
			<Check className="size-4" />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
)

export { Checkbox }
