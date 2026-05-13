import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

const Switch = ({ className, ...props }: SwitchPrimitive.Root.Props) => (
	<SwitchPrimitive.Root
		data-slot="switch"
		className={cn(
			'peer ring-offset-background focus-visible:ring-ring inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-1-mlo-neutral inset-shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				'pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white/50 shadow-sm ring-0 transition-[translate,background-color] duration-200 ease-in-out data-[checked]:translate-x-4 data-[checked]:bg-primary'
			)}
		/>
	</SwitchPrimitive.Root>
)

export { Switch }
