import * as React from 'react'

/**
 * Minimal Slot implementation for the asChild pattern.
 * Replaces @radix-ui/react-slot with a lightweight alternative.
 * Merges parent props onto the single child element.
 */
function Slot({
	children,
	ref,
	...props
}: React.HTMLAttributes<HTMLElement> & {
	children?: React.ReactNode
	ref?: React.Ref<HTMLElement>
}) {
	if (React.isValidElement(children)) {
		const childProps = children.props as Record<string, unknown>
		return React.cloneElement(children, {
			...props,
			...childProps,
			ref,
			className: [props.className, childProps.className]
				.filter(Boolean)
				.join(' '),
		} as React.HTMLAttributes<HTMLElement>)
	}
	return <>{children}</>
}

export { Slot }
