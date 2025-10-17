import { useCallback, useId, useMemo, useState } from 'react'
import type { ControlledInputProps } from './types'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import languages, { allLanguageOptions } from '@/lib/languages'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useLanguagesToShow } from '@/hooks/use-profile'

const filterFunction = (value: string, search: string) => {
	search = search.toLocaleLowerCase()
	return (
		value === '' ? 1
		: value === search ? 1
		: value.startsWith(search) ? 0.9
		: languages[value].toLowerCase().startsWith(search) ? 0.8
		: `${value} ${languages[value]}`.toLowerCase().includes(search) ? 0.7
		: 0
	)
}

export function SelectOneOfYourLanguages({
	value,
	setValue,
	hasError,
	className,
}: ControlledInputProps) {
	const languagesToShow = useLanguagesToShow()
	const [open, setOpen] = useState(false)

	const generalLanguageOptions = useMemo(
		() =>
			allLanguageOptions.filter(
				(option) => !languagesToShow.includes(option.value)
			),
		[languagesToShow]
	)

	const onSelect = useCallback(
		(currentValue: string) => {
			setValue(currentValue === value ? '' : currentValue)
			setOpen(false)
		},
		[value, setValue, setOpen]
	)

	const id = useId()
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild className={cn('w-full', className)}>
				<Button
					variant="outline"
					role="combobox"
					aria-controls={id}
					aria-expanded={open}
					className={`bg-card placeholder:text-muted-foreground text-foreground justify-between font-normal ${hasError ? 'border-destructive' : ''}`}
				>
					{value ?
						allLanguageOptions.find((language) => language.value === value)
							?.label
					:	'Select language...'}
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent id={id} className="p-0">
				<Command filter={filterFunction}>
					<CommandInput placeholder="Search language..." className="my-1" />
					<CommandList>
						<CommandEmpty>No language found.</CommandEmpty>
						<CommandGroup>
							{!languagesToShow.length ? null : (
								languagesToShow.map((lang) =>
									lang === undefined ? null : (
										<CommandItem key={lang} value={lang} onSelect={onSelect}>
											<Check
												className={cn(
													'mr-2 size-4',
													value === lang ? 'opacity-100' : 'opacity-0'
												)}
											/>
											{languages[lang]} ({lang})
										</CommandItem>
									)
								)
							)}
						</CommandGroup>
						{!languagesToShow.length ? null : <CommandSeparator />}
						<CommandGroup>
							{generalLanguageOptions.map((language) => (
								<CommandItem
									key={language.value}
									value={language.value}
									onSelect={onSelect}
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
