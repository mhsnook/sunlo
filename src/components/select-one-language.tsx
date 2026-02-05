import { useId, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import type { ControlledInputProps } from './fields/types'
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

export function SelectOneLanguage({
	hasError = false,
	value,
	setValue,
	disabled,
	tabIndex,
	size = 'default',
}: ControlledInputProps & { size?: 'default' | 'lg' }) {
	const [open, setOpen] = useState(false)
	const id = useId()
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild className="w-full">
				<Button
					data-testid="language-selector-button"
					variant="outline"
					tabIndex={tabIndex}
					role="combobox"
					size={size}
					aria-expanded={open}
					aria-controls={id}
					className={`placeholder:text-muted-foreground text-foreground justify-between font-normal ${hasError ? 'border-destructive' : ''}`}
				>
					{value ?
						allLanguageOptions.find((language) => language.value === value)
							?.label
					:	'Select language...'}
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent id={id} className="p-0">
				<Command
					filter={(value, search) => {
						search = search.toLocaleLowerCase()
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
					<CommandInput
						placeholder="Search language..."
						className="my-1"
						data-testid="language-search-input"
					/>
					<CommandList>
						<CommandEmpty>No language found.</CommandEmpty>
						<CommandGroup data-testid="language-options">
							{allLanguageOptions.map((language) => (
								<CommandItem
									key={language.value}
									value={language.value}
									onSelect={(currentValue) => {
										setValue(currentValue === value ? '' : currentValue)
										setOpen(false)
									}}
									disabled={disabled?.includes(language.value)}
									data-key={language.value}
								>
									<Check
										className={`mr-2 size-4 ${value === language.value ? 'opacity-100' : 'opacity-0'}`}
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
