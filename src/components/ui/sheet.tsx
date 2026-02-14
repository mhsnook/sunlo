import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Sheet = ({ ...props }: SheetPrimitive.Root.Props) => (
	<SheetPrimitive.Root data-slot="sheet" {...props} />
)

const SheetTrigger = ({ ...props }: SheetPrimitive.Trigger.Props) => (
	<SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
)

const SheetClose = ({ ...props }: SheetPrimitive.Close.Props) => (
	<SheetPrimitive.Close data-slot="sheet-close" {...props} />
)

const SheetPortal = ({ ...props }: SheetPrimitive.Portal.Props) => (
	<SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
)

const SheetOverlay = ({
	className,
	...props
}: SheetPrimitive.Backdrop.Props) => (
	<SheetPrimitive.Backdrop
		className={cn(
			'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-40 bg-black/80',
			className
		)}
		{...props}
		data-slot="sheet-overlay"
	/>
)

const sheetVariants = cva(
	'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[open]:animate-in data-[closed]:animate-out data-[closed]:duration-300 data-[open]:duration-500',
	{
		variants: {
			side: {
				top: 'inset-x-0 top-0 border-b data-[closed]:slide-out-to-top data-[open]:slide-in-from-top',
				bottom:
					'inset-x-0 bottom-0 border-t data-[closed]:slide-out-to-bottom data-[open]:slide-in-from-bottom',
				left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[closed]:slide-out-to-left data-[open]:slide-in-from-left sm:max-w-sm',
				right:
					'inset-y-0 right-0 h-full w-3/4  border-l data-[closed]:slide-out-to-right data-[open]:slide-in-from-right sm:max-w-sm',
			},
		},
		defaultVariants: {
			side: 'right',
		},
	}
)

interface SheetContentProps
	extends SheetPrimitive.Popup.Props, VariantProps<typeof sheetVariants> {}

const SheetContent = ({
	side = 'right',
	className,
	children,
	...props
}: SheetContentProps) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Popup
			data-slot="sheet-content"
			className={cn(sheetVariants({ side }), className)}
			{...props}
		>
			{children}
			<SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[open]:bg-secondary absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
				<X className="size-4" />
				<span className="sr-only">Close</span>
			</SheetPrimitive.Close>
		</SheetPrimitive.Popup>
	</SheetPortal>
)

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col space-y-2 text-center sm:text-left',
			className
		)}
		{...props}
	/>
)

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
			className
		)}
		{...props}
	/>
)

const SheetTitle = ({ className, ...props }: SheetPrimitive.Title.Props) => (
	<SheetPrimitive.Title
		data-slot="sheet-title"
		className={cn('text-foreground text-lg font-semibold', className)}
		{...props}
	/>
)

const SheetDescription = ({
	className,
	...props
}: SheetPrimitive.Description.Props) => (
	<SheetPrimitive.Description
		data-slot="sheet-description"
		className={cn('text-muted-foreground text-sm', className)}
		{...props}
	/>
)

export {
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
