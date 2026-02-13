import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Circle } from 'lucide-react'

import { cn } from '@/lib/utils'

const RadioGroup = ({ className, ...props }: RadioGroupPrimitive.Props) => {
	return (
		<RadioGroupPrimitive
			className={cn('grid gap-2', className)}
			{...props}
			data-slot="radio-group"
		/>
	)
}

const RadioGroupItem = ({ className, ...props }: RadioPrimitive.Root.Props) => {
	return (
		<RadioPrimitive.Root
			data-slot="radio-group-item"
			className={cn(
				'border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square size-4 rounded-full border focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		>
			<RadioPrimitive.Indicator className="flex items-center justify-center">
				<Circle className="h-2.5 w-2.5 fill-current text-current" />
			</RadioPrimitive.Indicator>
		</RadioPrimitive.Root>
	)
}

export { RadioGroup, RadioGroupItem }
