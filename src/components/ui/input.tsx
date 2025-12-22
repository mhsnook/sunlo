import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = ({
	className,
	type,
	...props
}: React.ComponentProps<'input'>) => {
	return (
		<input
			type={type}
			className={cn(
				'border-primary-foresoft/30 hover:border-primary bg-card/50 ring-offset-background file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-2xl border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
				className
			)}
			data-slot="input"
			{...props}
		/>
	)
}
Input.displayName = 'Input'

export { Input }
