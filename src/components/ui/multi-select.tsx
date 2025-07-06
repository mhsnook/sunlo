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
}: {
	options: Option[]
	always?: string
	selected: string[]
	setSelected: Dispatch<SetStateAction<string[]>>
	placeholder?: string
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState('')

	const handleUnselect = useCallback(
		(value: string) => {
			setSelected(selected.filter((s) => s !== value))
		},
		[selected]
	)

	const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
		const input = inputRef.current
		if (input) {
			if (e.key === 'Delete' || e.key === 'Backspace') {
				if (input.value === '') {
					setSelected(() => {
						const newSelected = [...selected]
						newSelected.pop()
						return newSelected
					})
				}
			}
			// This is not a default behaviour of the <input /> field
			if (e.key === 'Escape') {
				input.blur()
			}
		}
	}, [])

	const selectables = options.filter(
		(option) => !selected.includes(option.value)
	)

	return (
		<Command
			onKeyDown={handleKeyDown}
			className="overflow-visible bg-transparent"
		>
			<div className="group border-primary-foresoft/30 hover:border-primary ring-offset-background focus-within:ring-ring rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-offset-2">
				<div className="flex flex-wrap gap-1">
					{always ?
						<Badge variant="default">{always}</Badge>
					:	null}
					{selected.map((value) => {
						const option = options.find((o) => o.value === value)
						return !option ? null : (
								<Badge key={value} variant="secondary">
									{option.label}
									<button
										className="ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												handleUnselect(value)
											}
										}}
										onMouseDown={(e) => {
											e.preventDefault()
											e.stopPropagation()
										}}
										type="button"
										onClick={() => handleUnselect(value)}
									>
										<X className="text-muted-foreground hover:text-foreground h-3 w-3" />
									</button>
								</Badge>
							)
					})}
					{/* Avoid having the "Search" Icon */}
					<CommandPrimitive.Input
						ref={inputRef}
						value={inputValue}
						onValueChange={setInputValue}
						onBlur={() => setOpen(false)}
						onFocus={() => setOpen(true)}
						placeholder={placeholder}
						className="placeholder:text-muted-foreground ml-2 flex-1 bg-transparent outline-none"
					/>
				</div>
			</div>
			<div className="relative mt-2">
				<CommandList>
					{open && selectables.length > 0 ?
						<div className="bg-popover text-popover-foreground animate-in absolute top-0 z-10 w-full rounded-md border shadow-md outline-none">
							<CommandGroup className="h-full overflow-auto">
								{selectables.map((option) =>
									option.label === always ?
										null
									:	<CommandItem
											key={option.value}
											onMouseDown={(e) => {
												e.preventDefault()
												e.stopPropagation()
											}}
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
