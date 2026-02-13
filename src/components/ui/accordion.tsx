import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

const Accordion = ({
	className,
	type: _type,
	collapsible: _collapsible,
	...props
}: AccordionPrimitive.Root.Props & {
	type?: 'single' | 'multiple'
	collapsible?: boolean
}) => (
	<AccordionPrimitive.Root
		data-slot="accordion"
		className={cn('flex w-full flex-col', className)}
		{...props}
	/>
)

const AccordionItem = ({
	className,
	...props
}: AccordionPrimitive.Item.Props) => (
	<AccordionPrimitive.Item
		data-slot="accordion-item"
		className={cn('border-b', className)}
		{...props}
	/>
)

const AccordionTrigger = ({
	className,
	children,
	...props
}: AccordionPrimitive.Trigger.Props) => (
	<AccordionPrimitive.Header className="flex grow">
		<AccordionPrimitive.Trigger
			data-slot="accordion-trigger"
			className={cn(
				'flex flex-1 items-center justify-between py-4 text-start font-medium transition-all hover:underline [&[aria-expanded=true]>svg]:rotate-180',
				className
			)}
			{...props}
		>
			{children}
			<ChevronDown className="size-4 shrink-0 transition-transform duration-200" />
		</AccordionPrimitive.Trigger>
	</AccordionPrimitive.Header>
)

const AccordionContent = ({
	className,
	children,
	...props
}: AccordionPrimitive.Panel.Props) => (
	<AccordionPrimitive.Panel
		data-slot="accordion-content"
		className="data-[closed]:animate-accordion-up data-[open]:animate-accordion-down overflow-hidden text-sm transition-all"
		{...props}
	>
		<div className={cn('pt-0 pb-4', className)}>{children}</div>
	</AccordionPrimitive.Panel>
)

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
