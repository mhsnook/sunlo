import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = ({
	className,
	...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
	return (
		<textarea
			className={cn(
				'border-lum-4 border-chroma-mlow hover:border-lum-4 hover:border-chroma-high bg-card/50 placeholder:text-con-mid text-con-mhigh flex min-h-[80px] w-full rounded-2xl border px-3 py-2 text-sm inset-shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			data-slot="textarea"
			{...props}
		/>
	)
}
Textarea.displayName = 'Textarea'

export { Textarea }
