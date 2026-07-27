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
				'border-lum-4 border-chroma-mlow hover:border-lum-4 hover:border-chroma-max bg-card/50 file:text-con-mhigh placeholder:text-con-mid focus-visible:outline-con-high flex h-10 w-full rounded-2xl border px-3 py-2 text-base inset-shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
				className
			)}
			data-slot="input"
			{...props}
		/>
	)
}
Input.displayName = 'Input'

export { Input }
