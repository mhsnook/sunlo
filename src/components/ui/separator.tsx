import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'

import { cn } from '@/lib/utils'

const Separator = ({
	className,
	orientation = 'horizontal',
	...props
}: SeparatorPrimitive.Props) => (
	<SeparatorPrimitive
		data-slot="separator"
		orientation={orientation}
		className={cn(
			'bg-primary-foresoft/30 shrink-0',
			orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
			className
		)}
		{...props}
	/>
)

export { Separator }
