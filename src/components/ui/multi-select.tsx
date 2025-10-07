// copied from https://github.com/mxkaske/mxkaske.dev/blob/main/components/craft/fancy-multi-select.tsx
import {
	type Dispatch,
	type KeyboardEvent,
	type SetStateAction,
	useCallback,
	useRef,
	useState,
} from 'react'

import { Command as CommandPrimitive } from 'cmdk'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { Button } from './button'
import { nullSubmit } from '@/lib/utils'

type Option = Record<'value' | 'label', string>

const addWithoutDuplicates = (array: string[], value: string) => {
	if (array.includes(value)) return array
	return [...array, value]
}

export function FancyMultiSelect({
	options,
	always,
	selected,
	setSelected,
	placeholder = 'Select options...',
	showSelected = true,
}: {
	options: Option[]
	always?: string
	selected: string[]
	setSelected: Dispatch<SetStateAction<string[]>>
	placeholder?: string
	showSelected?: boolean
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState('')
	const setItClosed = useCallback(() => setOpen(false), [setOpen])
	const setItOpen = useCallback(() => setOpen(true), [setOpen])

	const handleUnselect = useCallback(
		(value: string) => {
			setSelected(selected.filter((s) => s !== value))
		},
		[selected, setSelected]
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			const input = inputRef.current
			if (input) {
				if (e.key === 'Delete' || e.key === 'Backspace') {
					if (input.value === '') {
						if (selected.length) handleUnselect(selected[selected.length - 1])
					}
				}
				// This is not a default behaviour of the <input /> field
				if (e.key === 'Escape') {
					input.blur()
				}
			}
		},
		[selected, inputRef, handleUnselect]
	)

	const selectables = options.filter(
		(option) => !selected.includes(option.value)
	)

	return (
		<Command
			onKeyDown={handleKeyDown}
			className="overflow-visible bg-transparent"
		>
			<div className="group border-primary-foresoft/30 hover:border-primary ring-offset-background focus-within:ring-ring rounded-2xl border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-offset-2">
				<div className="flex flex-wrap gap-1">
					{showSelected && (
						<ShowSelected
							always={always}
							selected={selected}
							options={options}
							setSelected={setSelected}
						/>
					)}
					{/* Avoid having the "Search" Icon */}
					<CommandPrimitive.Input
						ref={inputRef}
						value={inputValue}
						onValueChange={setInputValue}
						onBlur={setItClosed}
						onFocus={setItOpen}
						placeholder={placeholder}
						className="placeholder:text-muted-foreground ml-2 flex-1 bg-transparent outline-none"
					/>
				</div>
			</div>
			<div className="relative mt-2">
				<CommandList>
					{open && selectables.length === 0 ?
						<div className="bg-popover text-popover-foreground animate-in absolute top-0 z-10 w-full rounded-md border shadow-md outline-none">
							<CommandGroup className="h-full overflow-auto">
								<CommandItem>No options available</CommandItem>
							</CommandGroup>
						</div>
					:	null}
					{open && selectables.length > 0 ?
						<div className="bg-popover text-popover-foreground animate-in absolute top-0 z-10 w-full rounded-md border shadow-md outline-none">
							<CommandGroup className="h-full overflow-auto">
								{selectables.map((option) =>
									option.label === always ?
										null
									:	<CommandItem
											key={option.value}
											// oxlint-disable-next-line jsx-no-new-function-as-prop
											onMouseDown={nullSubmit}
											// oxlint-disable-next-line jsx-no-new-function-as-prop
											onSelect={() => {
												setInputValue('')
												setSelected(
													addWithoutDuplicates(selected, option.value)
												)
											}}
											className={'cursor-pointer'}
										>
											{option.label}
										</CommandItem>
								)}
							</CommandGroup>
						</div>
					:	null}
				</CommandList>
			</div>
		</Command>
	)
}

export function ShowSelected({
	always,
	selected,
	options,
	setSelected,
}: {
	always?: string
	selected: string[]
	options: Option[]
	setSelected: (value: string[]) => void
}) {
	const handleUnselect = useCallback(
		(value: string) => {
			setSelected(selected.filter((s) => s !== value))
		},
		[selected, setSelected]
	)
	return (
		<>
			{always ?
				<Badge variant="default">{always}</Badge>
			:	null}
			{selected.map((value) => {
				const option = options.find((o) => o.value === value)
				return !option ? null : (
						<Badge key={value} size="lg" variant="outline" className="pe-1.5">
							{option.label}
							<Button
								size="icon"
								variant="badge-outline"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleUnselect(value)
									}
								}}
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onMouseDown={nullSubmit}
								type="button"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => handleUnselect(value)}
							>
								<X />
							</Button>
						</Badge>
					)
			})}
		</>
	)
}
