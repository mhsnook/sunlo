import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'

import { cn } from '@/lib/utils'

const Avatar = ({ className, ...props }: AvatarPrimitive.Root.Props) => (
	<AvatarPrimitive.Root
		data-slot="avatar"
		className={cn(
			'rounded-squircle relative flex size-10 shrink-0 overflow-hidden rounded-lg',
			className
		)}
		{...props}
	/>
)

const AvatarImage = ({ className, ...props }: AvatarPrimitive.Image.Props) => (
	<AvatarPrimitive.Image
		data-slot="avatar-image"
		className={cn('aspect-square h-full w-full object-cover', className)}
		{...props}
	/>
)

const AvatarFallback = ({
	className,
	...props
}: AvatarPrimitive.Fallback.Props) => (
	<AvatarPrimitive.Fallback
		data-slot="avatar-fallback"
		className={cn(
			'bg-muted flex h-full w-full items-center justify-center',
			className
		)}
		{...props}
	/>
)

export { Avatar, AvatarImage, AvatarFallback }
