import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const labelVariants = cva(
	'text-sm font-semibold text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 pe-1'
)

const Label = ({
	className,
	ref,
	...props
}: React.ComponentProps<'label'> & VariantProps<typeof labelVariants>) => {
	return (
		// oxlint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor passed via ...props
		<label
			ref={ref}
			data-slot="label"
			className={cn(labelVariants(), className)}
			{...props}
		/>
	)
}

export { Label }
