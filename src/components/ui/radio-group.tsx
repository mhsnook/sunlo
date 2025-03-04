import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'

import { cn } from '@/lib/utils'

const RadioGroup = ({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) => {
	return (
		<RadioGroupPrimitive.Root
			className={cn('grid gap-2', className)}
			{...props}
			data-slot="radio-group"
		/>
	)
}
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = ({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) => {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				'aspect-square size-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
				<Circle className="h-2.5 w-2.5 fill-current text-current" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	)
}
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
