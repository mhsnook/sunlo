import * as React from 'react'

import { cn } from '@/lib/utils'

const labelClasses =
	'text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 pe-1'

const Label = ({ className, ref, ...props }: React.ComponentProps<'label'>) => {
	return (
		// oxlint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor passed via ...props
		<label
			ref={ref}
			data-slot="label"
			className={cn(labelClasses, className)}
			{...props}
		/>
	)
}

export { Label }
