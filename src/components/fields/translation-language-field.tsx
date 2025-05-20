import { Label } from '@/components/ui/label'
import { useController } from 'react-hook-form'
import { ErrorLabel, type ControlledFieldProps } from '.'
import { useProfile } from '@/lib/use-profile'
import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { cn } from '@/lib/utils'
import languages, { allLanguageOptions } from '@/lib/languages'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '../ui/button'
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '../ui/command'
import { CommandGroup } from 'cmdk'

export default function TranslationLanguageField({
	control,
	error,
}: ControlledFieldProps) {
	const { data: profile } = useProfile()
	const myLanguages = [
		profile?.language_primary,
		...(profile?.languages_spoken || []),
	].filter((l) => !!l)

	const [open, setOpen] = useState(false)
	const generalLanguageOptions = useMemo(
		() =>
			allLanguageOptions.filter(
				(option) => myLanguages.indexOf(option.value) === -1
			),
		[profile]
	)

	const controller = useController({ name: 'translation_lang', control })

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
						aria-expanded={open}
						className={cn(
							'bg-card placeholder:text-muted-foreground justify-between font-normal',
							!!error && 'border-destructive'
						)}
					>
						{controller.field.value ?
							allLanguageOptions.find(
								(language) => language.value === controller.field.value
							)?.label
						:	'Select language...'}
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0">
					<Command
						filter={(value, search) => {
							search = search.toLocaleLowerCase()
							return (
								value === '' ? 1
								: value === search ? 1
								: value.startsWith(search) ? 0.9
								: languages[value].toLowerCase().startsWith(search) ? 0.8
								: (
									`${value} ${languages[value]}`.toLowerCase().includes(search)
								) ?
									0.7
								:	0
							)
						}}
					>
						<CommandInput placeholder="Search language..." className="my-1" />
						<CommandList>
							<CommandEmpty>No language found.</CommandEmpty>
							<CommandGroup>
								{myLanguages.map((lang) =>
									lang === undefined ? null : (
										<CommandItem
											key={lang}
											value={lang}
											onSelect={(currentValue) => {
												controller.field.onChange(
													currentValue === controller.field.value ?
														''
													:	currentValue
												)
												setOpen(false)
											}}
										>
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
								)}
							</CommandGroup>
							{myLanguages.length === 0 ? null : <CommandSeparator />}
							<CommandGroup>
								{generalLanguageOptions.map((language) => (
									<CommandItem
										key={language.value}
										value={language.value}
										onSelect={(currentValue) => {
											controller.field.onChange(
												currentValue === controller.field.value ?
													''
												:	currentValue
											)
											setOpen(false)
										}}
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
			<ErrorLabel {...error} />
		</div>
	)
}
