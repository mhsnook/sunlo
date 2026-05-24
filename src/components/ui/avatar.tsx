import type { CSSProperties } from 'react'
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'

import { cn } from '@/lib/utils'
import { getAvatarHue } from '@/lib/lang-theme'

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
	seed,
	style,
	...props
}: AvatarPrimitive.Fallback.Props & { seed?: string }) => (
	<AvatarPrimitive.Fallback
		data-slot="avatar-fallback"
		className={cn(
			'flex h-full w-full items-center justify-center',
			seed ? 'bg-5-mhi-primary text-primary-foreground' : 'bg-muted',
			className
		)}
		style={
			seed
				? {
						...style,
						...({ '--hue-primary': getAvatarHue(seed) } as CSSProperties),
					}
				: style
		}
		{...props}
	/>
)

export { Avatar, AvatarImage, AvatarFallback }
