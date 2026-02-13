import * as React from 'react'
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

const Collapsible = ({ ...props }: CollapsiblePrimitive.Root.Props) => (
	<CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
)

const CollapsibleTrigger = ({
	asChild,
	children,
	...props
}: CollapsiblePrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<CollapsiblePrimitive.Trigger
				data-slot="collapsible-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props}>
			{children}
		</CollapsiblePrimitive.Trigger>
	)
}

const CollapsibleContent = ({ ...props }: CollapsiblePrimitive.Panel.Props) => (
	<CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
)

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
