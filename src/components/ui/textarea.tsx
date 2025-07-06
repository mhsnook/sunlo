import * as React from 'react'

import { cn } from '@/lib/utils'

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = ({ className, ...props }: TextareaProps) => {
	return (
		<textarea
			className={cn(
				'border-primary-foresoft/30 hover:border-primary bg-card ring-offset-background placeholder:text-muted-foreground text-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			data-slot="textarea"
			{...props}
		/>
	)
}
Textarea.displayName = 'Textarea'

export { Textarea }
