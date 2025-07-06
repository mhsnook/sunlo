import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { type ButtonProps, buttonVariants } from './button-variants'

const Button = ({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ButtonProps) => {
	const Comp = asChild ? Slot : 'button'
	return (
		<Comp
			className={cn(buttonVariants({ variant, size }), className)}
			data-slot="button"
			{...props}
		/>
	)
}
Button.displayName = 'Button'

export { Button }
