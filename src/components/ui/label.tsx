import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const labelVariants = cva(
	'text-sm font-semibold text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 pe-1'
)

const Label = ({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
	VariantProps<typeof labelVariants>) => (
	<LabelPrimitive.Root
		data-slot="label"
		className={cn(labelVariants(), className)}
		{...props}
	/>
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
