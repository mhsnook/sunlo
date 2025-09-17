import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, PlusCircle, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

export function MultiSelectCreatable({
	options,
	selected,
	onChange,
	className,
}: {
	options: Array<{ value: string; label: string }>
	selected: Array<string>
	onChange: (selected: Array<string>) => void
	className?: string
}) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState('')

	const handleSelect = (value: string) => {
		onChange([...selected, value])
		setInputValue('')
	}

	const handleRemove = (value: string) => {
		onChange(selected.filter((s) => s !== value))
	}

	const handleCreate = () => {
		if (inputValue && !selected.includes(inputValue)) {
			handleSelect(inputValue)
		}
	}

	const filteredOptions = options.filter((o) => !selected.includes(o.value))

	return (
		<div className={cn('space-y-2', className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between"
					>
						Select tags...
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
					<Command>
						<CommandInput
							placeholder="Search or create tag..."
							value={inputValue}
							onValueChange={setInputValue}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									handleCreate()
								}
							}}
						/>
						<CommandList>
							<CommandEmpty>No tags found.</CommandEmpty>
							{inputValue && (
								<CommandGroup>
									<CommandItem onSelect={handleCreate} value={inputValue}>
										<PlusCircle className="mr-2 h-4 w-4" />
										Create "{inputValue}"
									</CommandItem>
								</CommandGroup>
							)}
							<CommandGroup>
								{filteredOptions.map((option) => (
									<CommandItem
										key={option.value}
										value={option.value}
										onSelect={() => handleSelect(option.value)}
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												selected.includes(option.value) ? 'opacity-100' : (
													'opacity-0'
												)
											)}
										/>
										{option.label}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			<div className="flex flex-wrap gap-1">
				{selected.map((value) => (
					<Badge key={value} variant="secondary">
						{value}
						<button
							type="button"
							className="ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
							onClick={() => handleRemove(value)}
						>
							<X className="text-muted-foreground hover:text-foreground h-3 w-3" />
						</button>
					</Badge>
				))}
			</div>
		</div>
	)
}
