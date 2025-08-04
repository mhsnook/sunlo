import { Label } from '@/components/ui/label'
import { FieldValues, Path, useController } from 'react-hook-form'
import { ErrorLabel, type ControlledFieldProps } from '.'
import { useProfile } from '@/lib/use-profile'
import { useCallback, useId, useMemo, useState } from 'react'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import languages, { allLanguageOptions } from '@/lib/languages'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import { CommandGroup } from 'cmdk'

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

export default function TranslationLanguageField<T extends FieldValues>({
	control,
	error,
}: ControlledFieldProps<T>) {
	const { data: profile } = useProfile()
	const [open, setOpen] = useState(false)

	const generalLanguageOptions = useMemo(
		() =>
			allLanguageOptions.filter(
				(option) => !profile?.languagesToShow.includes(option.value)
			),
		[profile?.languagesToShow]
	)

	const controller = useController({
		name: 'translation_lang' as Path<T>,
		control,
	})

	const onSelect = useCallback(
		(currentValue: string) => {
			controller.field.onChange(
				currentValue === controller.field.value ? '' : currentValue
			)
			setOpen(false)
		},
		[controller.field, setOpen]
	)

	const id = useId()
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="lang" className={error ? 'text-destructive' : ''}>
				Translation for
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild className="w-full">
					<Button
						variant="outline"
						role="combobox"
						aria-controls={id}
						aria-expanded={open}
						className={`bg-card placeholder:text-muted-foreground text-foreground justify-between font-normal ${error ? 'border-destructive' : ''}`}
					>
						{controller.field.value ?
							allLanguageOptions.find(
								(language) => language.value === controller.field.value
							)?.label
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
								{!profile ? null : (
									profile.languagesToShow.map((lang) =>
										lang === undefined ? null : (
											<CommandItem key={lang} value={lang} onSelect={onSelect}>
												<Check
													className={cn(
														'mr-2 size-4',
														controller.field.value === lang ?
															'opacity-100'
														:	'opacity-0'
													)}
												/>
												{languages[lang]} ({lang})
											</CommandItem>
										)
									)
								)}
							</CommandGroup>
							{!profile || profile.languagesToShow.length === 0 ? null : (
								<CommandSeparator />
							)}
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
												controller.field.value === language.value ?
													'opacity-100'
												:	'opacity-0'
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
			<ErrorLabel error={error} />
		</div>
	)
}
