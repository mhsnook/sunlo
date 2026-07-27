import * as React from 'react'
import { Slot } from '@/lib/slot'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- ItemGroup is a generic container; using <ul> would impose list-item children styles
			role="list"
			data-slot="item-group"
			className={cn('group/item-group flex flex-col', className)}
			{...props}
		/>
	)
}

function ItemSeparator({
	className,
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="item-separator"
			orientation="horizontal"
			className={cn('my-0', className)}
			{...props}
		/>
	)
}

const itemVariants = {
	default: 'item-variant-default',
	outline: 'item-variant-outline',
	muted: 'item-variant-muted',
} as const

const itemSizes = {
	default: 'item-size-default',
	sm: 'item-size-sm',
} as const

function Item({
	className,
	variant = 'default',
	size = 'default',
	asChild = false,
	...props
}: React.ComponentProps<'div'> & {
	variant?: keyof typeof itemVariants
	size?: keyof typeof itemSizes
	asChild?: boolean
}) {
	const Comp = asChild ? Slot : 'div'
	return (
		<Comp
			data-slot="item"
			data-variant={variant}
			data-size={size}
			className={cn(
				`group/item item ${itemVariants[variant]} ${itemSizes[size]}`,
				className
			)}
			{...props}
		/>
	)
}

const itemMediaVariants = {
	default: 'item-media-default',
	icon: 'item-media-icon',
	image: 'item-media-image',
} as const

function ItemMedia({
	className,
	variant = 'default',
	...props
}: React.ComponentProps<'div'> & {
	variant?: keyof typeof itemMediaVariants
}) {
	return (
		<div
			data-slot="item-media"
			data-variant={variant}
			className={cn(`item-media ${itemMediaVariants[variant]}`, className)}
			{...props}
		/>
	)
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-content"
			className={cn(
				'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
				className
			)}
			{...props}
		/>
	)
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-title"
			className={cn(
				'flex w-fit items-center gap-2 text-sm leading-snug font-medium',
				className
			)}
			{...props}
		/>
	)
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot="item-description"
			className={cn(
				'text-con-mid line-clamp-2 text-sm leading-normal font-normal text-balance',
				'[&>a:hover]:text-con-mid [&>a:hover]:chroma-max [&>a]:underline [&>a]:underline-offset-4',
				className
			)}
			{...props}
		/>
	)
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-actions"
			className={cn('flex items-center gap-2', className)}
			{...props}
		/>
	)
}

function ItemHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-header"
			className={cn(
				'flex basis-full items-center justify-between gap-2',
				className
			)}
			{...props}
		/>
	)
}

function ItemFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="item-footer"
			className={cn(
				'flex basis-full items-center justify-between gap-2',
				className
			)}
			{...props}
		/>
	)
}

export {
	Item,
	ItemMedia,
	ItemContent,
	ItemActions,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
	ItemDescription,
	ItemHeader,
	ItemFooter,
}
