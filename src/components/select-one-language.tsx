import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import languages, { allLanguageOptions } from '@/lib/languages'

interface SelectOneLanguageProps {
	autoFocus?: boolean
	hasError?: boolean
	value: string
	setValue: (value: string) => void
	disabled?: string[]
	tabIndex?: number
}

export function SelectOneLanguage({
	autoFocus = false,
	hasError = false,
	value,
	setValue,
	disabled,
	tabIndex,
}: SelectOneLanguageProps) {
	const [open, setOpen] = React.useState(false)
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger autoFocus={autoFocus} asChild className="w-full">
				<Button
					variant="outline"
					tabIndex={tabIndex}
					role="combobox"
					aria-expanded={open}
					className={cn(
						'bg-card placeholder:text-muted-foreground justify-between font-normal',
						hasError && 'border-destructive'
					)}
				>
					{value ?
						allLanguageOptions.find((language) => language.value === value)
							?.label
					:	'Select language...'}
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0">
				<Command
					filter={(value, search) => {
						return (
							value === '' ? 1
							: value === search ? 1
							: value.startsWith(search) ? 0.9
							: languages[value].toLowerCase().startsWith(search) ? 0.8
							: `${value} ${languages[value]}`.toLowerCase().includes(search) ?
								0.7
							:	0
						)
					}}
				>
					<CommandInput placeholder="Search language..." className="my-1" />
					<CommandList>
						<CommandEmpty>No language found.</CommandEmpty>
						<CommandGroup>
							{allLanguageOptions.map((language) => (
								<CommandItem
									key={language.value}
									value={language.value}
									onSelect={(currentValue) => {
										setValue(currentValue === value ? '' : currentValue)
										setOpen(false)
									}}
									disabled={disabled?.includes(language.value)}
								>
									<Check
										className={cn(
											'mr-2 size-4',
											value === language.value ? 'opacity-100' : 'opacity-0'
										)}
									/>
									{language.label} ({language.value})
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
