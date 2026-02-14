import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const AlertDialog = ({ ...props }: AlertDialogPrimitive.Root.Props) => (
	<AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
)

const AlertDialogTrigger = ({
	asChild,
	children,
	...props
}: AlertDialogPrimitive.Trigger.Props & { asChild?: boolean }) => {
	if (asChild && React.isValidElement(children)) {
		return (
			<AlertDialogPrimitive.Trigger
				data-slot="alert-dialog-trigger"
				render={children as React.ReactElement}
				{...props}
			/>
		)
	}
	return (
		<AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props}>
			{children}
		</AlertDialogPrimitive.Trigger>
	)
}

const AlertDialogPortal = ({ ...props }: AlertDialogPrimitive.Portal.Props) => (
	<AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
)

const AlertDialogOverlay = ({
	className,
	...props
}: AlertDialogPrimitive.Backdrop.Props) => (
	<AlertDialogPrimitive.Backdrop
		className={cn(
			'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
			className
		)}
		{...props}
		data-slot="alert-dialog-overlay"
	/>
)

const AlertDialogContent = ({
	className,
	...props
}: AlertDialogPrimitive.Popup.Props) => (
	<AlertDialogPortal>
		<AlertDialogOverlay />
		<AlertDialogPrimitive.Popup
			data-slot="alert-dialog-content"
			className={cn(
				'bg-background text-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[min(32rem,96%)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded border p-6 shadow-lg duration-200',
				className
			)}
			{...props}
		/>
	</AlertDialogPortal>
)

const AlertDialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('flex flex-col space-y-2 border-b pb-4', className)}
		{...props}
	/>
)

const AlertDialogFooter = ({
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

const AlertDialogTitle = ({
	className,
	...props
}: AlertDialogPrimitive.Title.Props) => (
	<AlertDialogPrimitive.Title
		data-slot="alert-dialog-title"
		className={cn('text-lg font-semibold', className)}
		{...props}
	/>
)

const AlertDialogDescription = ({
	className,
	...props
}: AlertDialogPrimitive.Description.Props) => (
	<AlertDialogPrimitive.Description
		data-slot="alert-dialog-description"
		className={cn('text-muted-foreground text-sm', className)}
		{...props}
	/>
)

const AlertDialogAction = ({
	className,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
	<button
		data-slot="alert-dialog-action"
		className={cn(buttonVariants(), className)}
		{...props}
	/>
)

const AlertDialogCancel = ({
	className,
	...props
}: AlertDialogPrimitive.Close.Props) => (
	<AlertDialogPrimitive.Close
		data-slot="alert-dialog-cancel"
		className={cn(
			buttonVariants({ variant: 'secondary' }),
			'mt-2 @xl:mt-0',
			className
		)}
		{...props}
	/>
)

export {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogOverlay,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
}
