import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn } from '@/lib/utils'

const Avatar = ({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
	<AvatarPrimitive.Root
		data-slot="avatar"
		className={cn(
			'relative flex size-10 shrink-0 overflow-hidden rounded-full',
			className
		)}
		{...props}
	/>
)
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = ({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
	<AvatarPrimitive.Image
		data-slot="avatar-image"
		className={cn('aspect-square h-full w-full object-cover', className)}
		{...props}
	/>
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = ({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
	<AvatarPrimitive.Fallback
		data-slot="avatar-fallback"
		className={cn(
			'bg-muted flex h-full w-full items-center justify-center rounded-full',
			className
		)}
		{...props}
	/>
)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
