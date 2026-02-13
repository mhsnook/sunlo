import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Dialog = ({ ...props }: DialogPrimitive.Root.Props) => (
	<DialogPrimitive.Root data-slot="dialog" {...props} />
)

const DialogTrigger = ({
	asChild,
	children,
	...props
}: DialogPrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<DialogPrimitive.Trigger
				data-slot="dialog-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<DialogPrimitive.Trigger data-slot="dialog-trigger" {...props}>
			{children}
		</DialogPrimitive.Trigger>
	)
}

const DialogPortal = ({ ...props }: DialogPrimitive.Portal.Props) => (
	<DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
)

const DialogClose = ({
	asChild,
	children,
	...props
}: DialogPrimitive.Close.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<DialogPrimitive.Close
				data-slot="dialog-close"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<DialogPrimitive.Close data-slot="dialog-close" {...props}>
			{children}
		</DialogPrimitive.Close>
	)
}

const DialogOverlay = ({
	className,
	...props
}: DialogPrimitive.Backdrop.Props) => (
	<DialogPrimitive.Backdrop
		data-slot="dialog-overlay"
		className={cn(
			'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
			className
		)}
		{...props}
	/>
)

const DialogContent = ({
	className,
	children,
	onInteractOutside: _onInteractOutside,
	onEscapeKeyDown: _onEscapeKeyDown,
	...props
}: DialogPrimitive.Popup.Props & {
	onInteractOutside?: unknown
	onEscapeKeyDown?: unknown
}) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Popup
			data-slot="dialog-content"
			className={cn(
				'bg-background data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[min(50rem,96%)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded border p-6 shadow-lg duration-200',
				className
			)}
			{...props}
		>
			{children}
			<DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[open]:bg-accent data-[open]:text-muted-foreground absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
				<X className="size-4" />
				<span className="sr-only">Close</span>
			</DialogPrimitive.Close>
		</DialogPrimitive.Popup>
	</DialogPortal>
)

const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('flex flex-col space-y-1.5 border-b pb-4', className)}
		{...props}
	/>
)

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col-reverse @xl:flex-row @xl:justify-end @xl:space-x-2',
			className
		)}
		{...props}
	/>
)

const DialogTitle = ({ className, ...props }: DialogPrimitive.Title.Props) => (
	<DialogPrimitive.Title
		data-slot="dialog-title"
		className={cn(
			'text-foreground/90 text-lg leading-none font-semibold tracking-tight',
			className
		)}
		{...props}
	/>
)

const DialogDescription = ({
	className,
	...props
}: DialogPrimitive.Description.Props) => (
	<DialogPrimitive.Description
		data-slot="dialog-description"
		className={cn('text-muted-foreground text-sm', className)}
		{...props}
	/>
)

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogClose,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
}
